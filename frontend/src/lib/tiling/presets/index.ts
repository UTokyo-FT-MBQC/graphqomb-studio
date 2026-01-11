import { type TilingPattern, TilingPatternSchema } from "@/types/tiling";

import brickworkData from "./brickwork.json";
import cubicData from "./cubic.json";
import honeycombData from "./honeycomb.json";
import rhgData from "./rhg.json";
import squareLatticeData from "./square-lattice.json";
import triangularData from "./triangular.json";

/**
 * Parse and validate a preset JSON, logging errors but not throwing.
 */
function parsePreset(data: unknown, name: string): TilingPattern | null {
  const result = TilingPatternSchema.safeParse(data);
  if (result.success) {
    return result.data as TilingPattern;
  }
  console.error(`Failed to parse tiling preset "${name}":`, result.error.format());
  return null;
}

/**
 * All available tiling presets.
 * Invalid presets are filtered out at load time.
 */
export const TILING_PRESETS: TilingPattern[] = [
  parsePreset(squareLatticeData, "square-lattice"),
  parsePreset(brickworkData, "brickwork"),
  parsePreset(triangularData, "triangular"),
  parsePreset(honeycombData, "honeycomb"),
  parsePreset(cubicData, "cubic"),
  parsePreset(rhgData, "rhg"),
].filter((p): p is TilingPattern => p !== null);

/**
 * 2D presets only (for 2D canvas).
 */
export const TILING_PRESETS_2D: TilingPattern[] = TILING_PRESETS.filter((p) => p.dimension === 2);

/**
 * 3D presets only (for 3D canvas).
 */
export const TILING_PRESETS_3D: TilingPattern[] = TILING_PRESETS.filter((p) => p.dimension === 3);

/**
 * Get a preset by ID.
 */
export function getPresetById(id: string): TilingPattern | undefined {
  return TILING_PRESETS.find((p) => p.id === id);
}

/**
 * Get a 2D preset by ID.
 */
export function get2DPresetById(id: string): TilingPattern | undefined {
  return TILING_PRESETS_2D.find((p) => p.id === id);
}

/**
 * Get a 3D preset by ID.
 */
export function get3DPresetById(id: string): TilingPattern | undefined {
  return TILING_PRESETS_3D.find((p) => p.id === id);
}
