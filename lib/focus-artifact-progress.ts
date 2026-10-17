export const FOCUS_ARTIFACT_MILESTONES = [1, 2, 3, 4, 5, 7, 10, 14, 18, 24, 32, 40] as const;

const FIRST_REVEAL = 0.18;

/** Reveal more of the artwork after every session, with twelve visible milestones. */
export function artifactReveal(sessionCount: number): number {
  const count = Math.max(0, Math.floor(sessionCount));
  if (count === 0) return 0;
  const lastIndex = FOCUS_ARTIFACT_MILESTONES.length - 1;
  if (count >= FOCUS_ARTIFACT_MILESTONES[lastIndex]) return 1;

  const nextIndex = FOCUS_ARTIFACT_MILESTONES.findIndex((milestone) => count <= milestone);
  const previousIndex = Math.max(0, nextIndex - 1);
  const previousCount = FOCUS_ARTIFACT_MILESTONES[previousIndex];
  const nextCount = FOCUS_ARTIFACT_MILESTONES[nextIndex];
  const between = nextIndex === 0 ? 0 : (count - previousCount) / (nextCount - previousCount);
  return FIRST_REVEAL + (1 - FIRST_REVEAL) * (previousIndex + between) / lastIndex;
}

export function artifactMask(reveal: number): string | undefined {
  if (reveal >= 1) return undefined;
  const edge = Math.max(0, Math.min(100, reveal * 100));
  const solid = Math.max(0, edge - 8);
  return `linear-gradient(to right, black ${solid}%, transparent ${edge}%)`;
}
