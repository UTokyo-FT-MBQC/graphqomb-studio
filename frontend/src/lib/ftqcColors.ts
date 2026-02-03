/**
 * FTQC Visualization Color Palette
 *
 * Color definitions for Parity Check Groups and Logical Observables visualization.
 * - Parity Groups: Warm colors (orange, amber, yellow, lime, cyan)
 * - Logical Observables: Cool colors (purple, pink, indigo, violet, fuchsia)
 */

// Parity group colors (warm colors, cyclic)
export const PARITY_GROUP_COLORS = [
  { name: "orange", hex: "#f97316", rgb: "249, 115, 22" },
  { name: "amber", hex: "#f59e0b", rgb: "245, 158, 11" },
  { name: "yellow", hex: "#eab308", rgb: "234, 179, 8" },
  { name: "lime", hex: "#84cc16", rgb: "132, 204, 22" },
  { name: "cyan", hex: "#06b6d4", rgb: "6, 182, 212" },
] as const;

// Logical observable colors (cool colors, cyclic)
export const OBSERVABLE_COLORS = [
  { name: "purple", hex: "#a855f7", rgb: "168, 85, 247" },
  { name: "pink", hex: "#ec4899", rgb: "236, 72, 153" },
  { name: "indigo", hex: "#6366f1", rgb: "99, 102, 241" },
  { name: "violet", hex: "#8b5cf6", rgb: "139, 92, 246" },
  { name: "fuchsia", hex: "#d946ef", rgb: "217, 70, 239" },
] as const;

export type FTQCHighlightType = "parity" | "observable";

export interface FTQCHighlight {
  type: FTQCHighlightType;
  colorHex: string;
  colorRgb: string;
  groupIndex: number;
  groupKey?: string; // Only for observables
}

/**
 * Get color for a parity group by index (cyclic)
 */
export function getParityGroupColor(index: number): (typeof PARITY_GROUP_COLORS)[number] {
  // Use modulo to wrap around - array is guaranteed non-empty by const definition
  const idx = index % PARITY_GROUP_COLORS.length;
  // biome-ignore lint/style/noNonNullAssertion: Array is statically defined with 5 elements, idx is always valid
  return PARITY_GROUP_COLORS[idx]!;
}

/**
 * Get color for a logical observable by index (cyclic)
 */
export function getObservableColor(index: number): (typeof OBSERVABLE_COLORS)[number] {
  // Use modulo to wrap around - array is guaranteed non-empty by const definition
  const idx = index % OBSERVABLE_COLORS.length;
  // biome-ignore lint/style/noNonNullAssertion: Array is statically defined with 5 elements, idx is always valid
  return OBSERVABLE_COLORS[idx]!;
}

/**
 * Create glow effect CSS for 2D nodes
 */
export function createGlowEffect(rgb: string, intensity = 0.8): string {
  return `0 0 12px 3px rgba(${rgb}, ${intensity}), 0 0 20px 6px rgba(${rgb}, 0.4)`;
}
