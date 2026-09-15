import type { ProjectKey } from "./types";

export const PROJECTS: Record<ProjectKey, { label: string; dot: string; block: string }> = {
  personal: { label: "Personal", dot: "#C79A5F", block: "var(--block-1)" },
  university: { label: "University", dot: "#8AA07A", block: "var(--block-2)" },
  work: { label: "Work", dot: "#8FA0B6", block: "var(--block-4)" },
  aevia: { label: "Aevia", dot: "#D8B26A", block: "var(--block-5)" },
  travel: { label: "Travel", dot: "#B48A76", block: "var(--block-3)" },
};

export const projectList = Object.entries(PROJECTS) as [
  ProjectKey,
  (typeof PROJECTS)[ProjectKey]
][];

export function blockColor(index?: number): string {
  const i = (((index ?? 1) - 1) % 6) + 1;
  return `var(--block-${i})`;
}
