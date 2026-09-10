import { useEffect, useState } from "react";

/**
 * Atrasa a propagação de um valor até ele parar de mudar por `delay` ms.
 *
 * Usado nas buscas para não disparar uma requisição por tecla digitada.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
