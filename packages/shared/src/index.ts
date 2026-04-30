export const verdicts = ["Safe", "Review", "Block"] as const;

export type Verdict = (typeof verdicts)[number];
