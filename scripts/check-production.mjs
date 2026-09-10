// Regression check: production must start without any build-only dependencies.
// Run after npm run build. No real database or credentials are needed.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import assert from "node:assert/strict";

const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const blocked = Object.keys(pkg.devDependencies).filter(name => !pkg.dependencies[name]);
const entry = new URL("../dist/index.js", import.meta.url).href;
const bootstrap = `
  import { registerHooks } from 'node:module';
  const blocked = ${JSON.stringify(blocked)};
  registerHooks({ resolve(specifier, context, next) {
    if (blocked.some(name => specifier === name || specifier.startsWith(name + '/'))) {
      throw new Error('Production tried to load development dependency: ' + specifier);
    }
    return next(specifier, context);
  }});
  await import(${JSON.stringify(entry)});
`;
const child = spawn(process.execPath, ["--input-type=module", "--eval", bootstrap], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, NODE_ENV: "production", PORT: String(port),
    DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test", PGSSL: "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
let started = false;
child.stdout.on("data", chunk => { output += chunk; if (output.includes("serving on port")) started = true; });
child.stderr.on("data", chunk => { output += chunk; });
try {
  const deadline = Date.now() + 15000;
  while (!started && Date.now() < deadline && child.exitCode === null) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(started, `Production failed to start:\n${output}`);
  const base = `http://127.0.0.1:${port}`;
  const api = await fetch(`${base}/api/food/sources`, { signal: AbortSignal.timeout(5000) });
  assert.equal(api.status, 200);
  assert.equal((await api.json()).taco.enabled, true);
  const page = await fetch(base, { signal: AbortSignal.timeout(5000) });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<html/i);
  console.log("PASS: production starts and serves API + UI with development dependencies blocked.");
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
}
