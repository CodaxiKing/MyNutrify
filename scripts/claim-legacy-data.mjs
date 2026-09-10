/**
 * Transfere os dados do usuário de demonstração para uma conta real.
 *
 * Antes do login existir, tudo era gravado sob um usuário fixo (`user-1`).
 * Este script reatribui refeições, atividades, receitas, treinos, jejuns e
 * resumos diários para a conta indicada, e depois remove o usuário antigo.
 *
 * Uso:
 *   node scripts/claim-legacy-data.mjs voce@email.com
 *   node scripts/claim-legacy-data.mjs voce@email.com --from=user-1 --dry-run
 */

import pg from "pg";

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"));
const fromId = (args.find((arg) => arg.startsWith("--from=")) ?? "--from=user-1").split("=")[1];
const dryRun = args.includes("--dry-run");

if (!email) {
  console.error("Uso: node scripts/claim-legacy-data.mjs <email-da-conta> [--from=user-1] [--dry-run]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}

/** Tabelas com uma coluna user_id apontando para o dono do registro. */
const TABLES = [
  "meal_entries",
  "activity_entries",
  "daily_summaries",
  "recipes",
  "workout_plans",
  "workout_sessions",
  "fasting_sessions",
];

const sslEnabled =
  process.env.PGSSL === "true" ||
  (process.env.PGSSL !== "false" && process.env.NODE_ENV === "production");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

const client = await pool.connect();

try {
  const { rows: targets } = await client.query(
    `SELECT id, email, height, weight, age, gender, fitness_goal
       FROM users WHERE lower(email) = lower($1)`,
    [email],
  );

  if (targets.length === 0) {
    console.error(`Nenhuma conta com o e-mail ${email}. Cadastre-se no app primeiro.`);
    process.exit(1);
  }

  const target = targets[0];

  const { rows: sources } = await client.query(
    `SELECT id, height, weight, age, gender, fitness_goal, bmr, daily_calorie_goal
       FROM users WHERE id = $1`,
    [fromId],
  );

  if (sources.length === 0) {
    console.log(`Usuário de origem "${fromId}" não existe — nada a migrar.`);
    process.exit(0);
  }

  if (target.id === fromId) {
    console.error("A conta de destino é a própria origem.");
    process.exit(1);
  }

  console.log(`Migrando de "${fromId}" para "${target.email}" (${target.id})`);
  if (dryRun) console.log("--dry-run: nada será gravado.\n");

  // Uma transação só: ou tudo muda de dono, ou nada muda.
  await client.query("BEGIN");

  let total = 0;

  for (const table of TABLES) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS total FROM ${table} WHERE user_id = $1`,
      [fromId],
    );
    const count = rows[0].total;
    total += count;

    if (count > 0 && !dryRun) {
      await client.query(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [
        target.id,
        fromId,
      ]);
    }

    console.log(`  ${String(count).padStart(4)} ${table}`);
  }

  // O perfil (altura, peso, idade, objetivo, BMR e meta) fica na própria linha
  // do usuário, então não vem junto com as tabelas acima. Copia só quando a
  // conta de destino ainda não tem esses dados, para nunca sobrescrever o que
  // o usuário já preencheu.
  const source = sources[0];
  const targetHasProfile = Boolean(target.height && target.weight && target.age);

  if (source.height && source.weight && source.age && !targetHasProfile) {
    if (!dryRun) {
      await client.query(
        `UPDATE users
            SET height = $1, weight = $2, age = $3, gender = $4,
                fitness_goal = $5, bmr = $6, daily_calorie_goal = $7,
                updated_at = now()
          WHERE id = $8`,
        [
          source.height,
          source.weight,
          source.age,
          source.gender,
          source.fitness_goal,
          source.bmr,
          source.daily_calorie_goal,
          target.id,
        ],
      );
    }
    console.log(`     1 perfil (altura, peso, idade, objetivo)`);
  } else if (targetHasProfile) {
    console.log(`     - perfil da conta de destino preservado`);
  }

  if (dryRun) {
    await client.query("ROLLBACK");
    console.log(`\n${total} registros seriam migrados.`);
  } else {
    // O usuário antigo já não tem dados apontando para ele.
    await client.query("DELETE FROM users WHERE id = $1", [fromId]);
    await client.query("COMMIT");
    console.log(`\n${total} registros migrados. Usuário "${fromId}" removido.`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Falha na migração:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
