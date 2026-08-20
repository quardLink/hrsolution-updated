// Compares 128-d face-api.js recognition descriptors. Below this Euclidean
// distance, two descriptors are treated as the same person — 0.5 is
// stricter than face-api.js's own 0.6 "same person" default, since a false
// accept here means a coworker successfully buddy-punches.
const FACE_MATCH_THRESHOLD = 0.5;
const DESCRIPTOR_LENGTH = 128;

export function isValidDescriptor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === DESCRIPTOR_LENGTH &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function isFaceMatch(enrolled: number[], captured: number[]): boolean {
  return euclideanDistance(enrolled, captured) < FACE_MATCH_THRESHOLD;
}
