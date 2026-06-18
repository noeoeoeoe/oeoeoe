/**
 * Canonical measurement units. A small fixed set (instead of free text) keeps
 * quantities mergeable: "g" always equals "g", so amounts can be summed when an
 * ingredient is added to errands more than once.
 */
export const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp'] as const;

export type Unit = (typeof UNITS)[number];
