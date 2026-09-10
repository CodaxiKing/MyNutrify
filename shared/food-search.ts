/** Search spelling only: nutrition values and preparation names stay unchanged. */
export function normalizeFoodText(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function foodSearchTerms(query: string): string[] {
  const normalized = normalizeFoodText(query)
    .replace(/\b(?:aipim|macaxeira)\b/g, "mandioca")
    .replace(/\bjerimum\b/g, "abobora")
    .replace(/\bbatata baroa\b/g, "mandioquinha")
    .replace(/\bpao (?:de sal|cacetinho)\b/g, "pao frances")
    .replace(/\bcacetinho\b/g, "pao frances")
    .replace(/\barroz branco\b/g, "arroz tipo 1");
  // Keep com/sem: these distinguish nutritionally different preparations.
  return normalized.split(" ").filter(word => word && !["de", "da", "do", "das", "dos"].includes(word));
}
