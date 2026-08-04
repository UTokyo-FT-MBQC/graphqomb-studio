/** Helpers for GraphQOMB detector tags introduced by PTN format v3. */

export const FLAG_DETECTOR_TAG = "type=flag";

export function isFlagDetector(tag: string | undefined): boolean {
  return tag === FLAG_DETECTOR_TAG;
}
