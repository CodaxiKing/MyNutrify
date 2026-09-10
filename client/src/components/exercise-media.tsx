/**
 * Demonstração animada de um exercício.
 *
 * As imagens e GIFs são © Gym visual (https://gymvisual.com/) e vêm do dataset
 * hasaneyldrm/exercises-dataset. **Não são cobertos pela licença MIT dos dados
 * textuais** e não são redistribuídos neste repositório — são carregados da
 * origem, e a atribuição obrigatória é sempre renderizada junto.
 *
 * Ver EXERCISES-NOTICE.md antes de publicar o app.
 */

import { useState } from "react";
import { Dumbbell, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXERCISE_MEDIA_ATTRIBUTION, type LibraryExercise } from "@shared/exercises-library";

/**
 * Origem das mídias. O padrão é o CDN do jsDelivr sobre o repositório do
 * dataset — mais rápido e com cache melhor que o raw do GitHub. Aponte
 * `VITE_EXERCISE_MEDIA_BASE_URL` para o seu próprio storage se preferir servir
 * as mídias por conta própria.
 */
const MEDIA_BASE_URL =
  (import.meta.env.VITE_EXERCISE_MEDIA_BASE_URL as string | undefined)?.trim() ||
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main";

export const exerciseMediaEnabled = MEDIA_BASE_URL !== "off";

type MediaExercise = Pick<LibraryExercise, "id" | "name" | "mediaId">;

/** Monta a URL da mídia de um exercício. */
export function exerciseMediaUrl(
  exercise: MediaExercise,
  kind: "gif" | "image" = "gif",
): string {
  const folder = kind === "gif" ? "videos" : "images";
  const extension = kind === "gif" ? "gif" : "jpg";
  const base = MEDIA_BASE_URL.replace(/\/$/, "");

  return `${base}/${folder}/${exercise.id}-${exercise.mediaId}.${extension}`;
}

export interface ExerciseMediaProps {
  exercise: MediaExercise;
  /** `gif` anima a execução; `image` é o quadro estático, bem mais leve. */
  kind?: "gif" | "image";
  /** Esconde a legenda de atribuição — use só onde ela já aparece por perto. */
  hideAttribution?: boolean;
  className?: string;
}

export function ExerciseMedia({
  exercise,
  kind = "gif",
  hideAttribution = false,
  className,
}: ExerciseMediaProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  if (!exerciseMediaEnabled) {
    return <MediaPlaceholder className={className} />;
  }

  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white",
        className,
      )}
    >
      {/* Placeholder enquanto o GIF baixa — 124 KB demora em rede ruim. */}
      {status === "loading" && (
        <div className="shimmer absolute inset-0 bg-muted" aria-hidden />
      )}

      {status === "error" ? (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground">
          <ImageOff className="size-6" />
          <span className="text-[10px]">demonstração indisponível</span>
        </div>
      ) : (
        <img
          src={exerciseMediaUrl(exercise, kind)}
          alt={`Demonstração do exercício ${exercise.name}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className={cn(
            "aspect-square w-full object-contain transition-opacity",
            status === "ready" ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {/* Atribuição exigida pelos termos da Gym visual. */}
      {!hideAttribution && status !== "error" && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[9px] leading-tight text-white/90">
          {EXERCISE_MEDIA_ATTRIBUTION}
        </figcaption>
      )}
    </figure>
  );
}

/** Miniatura quadrada para listas. */
export function ExerciseThumb({
  exercise,
  className,
}: {
  exercise: MediaExercise;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!exerciseMediaEnabled || failed) {
    return <MediaPlaceholder className={className} />;
  }

  return (
    <img
      src={exerciseMediaUrl(exercise, "image")}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-xl bg-white object-contain", className)}
    />
  );
}

function MediaPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
        className,
      )}
    >
      <Dumbbell className="size-4" />
    </div>
  );
}
