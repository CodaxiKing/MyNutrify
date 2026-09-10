/**
 * Navegador da biblioteca de exercícios (1.324 exercícios).
 *
 * Busca por texto e filtros por região do corpo e equipamento. A consulta é
 * feita no servidor — o dataset não vai para o bundle do client.
 *
 * Dados: hasaneyldrm/exercises-dataset (MIT). Ver EXERCISES-NOTICE.md.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Dumbbell, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ExerciseThumb } from "@/components/exercise-media";
import { useExerciseFacets, useExerciseLibrary } from "@/hooks/use-workouts";
import {
  translateBodyPart,
  translateEquipment,
  translateMuscle,
  type LibraryExercise,
} from "@shared/exercises-library";

export interface ExerciseLibraryBrowserProps {
  /** Ids já escolhidos, para marcar visualmente. */
  selectedIds?: string[];
  onSelect: (exercise: LibraryExercise) => void;
  /** Mostra o detalhe do exercício ao tocar no nome. */
  onInspect?: (exercise: LibraryExercise) => void;
}

export function ExerciseLibraryBrowser({
  selectedIds = [],
  onSelect,
  onInspect,
}: ExerciseLibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Evita uma requisição por tecla digitada.
  const debouncedSearch = useDebounce(search, 300);

  const { data: facets } = useExerciseFacets();
  const { data, isLoading } = useExerciseLibrary({
    search: debouncedSearch,
    bodyPart: bodyPart || undefined,
    equipment: equipment || undefined,
    limit: 60,
  });

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeFilters = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------ busca */}
      <div className="space-y-2.5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar exercício, músculo, equipamento…"
            className="h-11 rounded-2xl pl-9 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ActionButton
            variant={activeFilters > 0 ? "soft" : "outline"}
            size="sm"
            icon={<Filter />}
            onClick={() => setShowFilters((open) => !open)}
          >
            Filtros
            {activeFilters > 0 && (
              <Badge className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                {activeFilters}
              </Badge>
            )}
          </ActionButton>

          <span className="ml-auto text-xs text-muted-foreground">
            {isLoading ? "buscando…" : `${data?.total ?? 0} exercícios`}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 pt-1">
                <FilterRow
                  label="Região"
                  options={facets?.bodyParts ?? []}
                  value={bodyPart}
                  onChange={setBodyPart}
                  translate={translateBodyPart}
                />
                <FilterRow
                  label="Equipamento"
                  options={facets?.equipment ?? []}
                  value={equipment}
                  onChange={setEquipment}
                  translate={translateEquipment}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --------------------------------------------------------- listagem */}
      <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="shimmer h-[68px] rounded-2xl bg-muted" />
          ))
        ) : data && data.items.length > 0 ? (
          data.items.map((exercise) => {
            const isSelected = selected.has(exercise.id);

            return (
              <motion.div
                key={exercise.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "surface-card flex items-center gap-3 p-3 transition-colors",
                  isSelected && "border-primary/50 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => onInspect?.(exercise)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {/* Miniatura estática (8 KB) em vez do GIF: numa lista de
                      60 itens, os GIFs somariam vários megabytes. */}
                  <ExerciseThumb
                    exercise={exercise}
                    className={cn(
                      "size-11",
                      isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize">
                      {exercise.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {translateMuscle(exercise.target)} ·{" "}
                      {translateEquipment(exercise.equipment)}
                    </p>
                  </div>
                </button>

                <ActionButton
                  variant={isSelected ? "soft" : "outline"}
                  size="sm"
                  aria-label={isSelected ? "Adicionar novamente" : "Adicionar ao treino"}
                  className="size-9 shrink-0 rounded-xl px-0"
                  onClick={() => onSelect(exercise)}
                >
                  {isSelected ? <Check className="size-4" /> : <span className="text-lg">+</span>}
                </ActionButton>
              </motion.div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <Dumbbell className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">Nenhum exercício encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tente outro termo ou remova os filtros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
  translate,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  translate: (value: string) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterChip active={value === ""} onClick={() => onChange("")}>
          Todos
        </FilterChip>
        {options.map((option) => (
          <FilterChip
            key={option}
            active={value === option}
            onClick={() => onChange(value === option ? "" : option)}
          >
            {translate(option)}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </motion.button>
  );
}
