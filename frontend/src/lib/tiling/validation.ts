import type { CellRange, TilingPattern } from "@/types/tiling";

/**
 * Validation result with optional error message.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a pattern is suitable for 2D canvas operations.
 */
export function validateFor2D(pattern: TilingPattern): ValidationResult {
  if (pattern.dimension !== 2) {
    return {
      valid: false,
      error: `Pattern "${pattern.name}" is ${pattern.dimension}D, but 2D is required`,
    };
  }
  return { valid: true };
}

/**
 * Validate that a pattern is suitable for 3D canvas operations.
 */
export function validateFor3D(pattern: TilingPattern): ValidationResult {
  if (pattern.dimension !== 3) {
    return {
      valid: false,
      error: `Pattern "${pattern.name}" is ${pattern.dimension}D, but 3D is required`,
    };
  }
  return { valid: true };
}

/**
 * Validate that a cell range is valid (min <= max for all axes).
 */
export function validateCellRange(range: CellRange): ValidationResult {
  if (range.x[0] > range.x[1]) {
    return {
      valid: false,
      error: `Invalid X range: ${range.x[0]} > ${range.x[1]}`,
    };
  }
  if (range.y[0] > range.y[1]) {
    return {
      valid: false,
      error: `Invalid Y range: ${range.y[0]} > ${range.y[1]}`,
    };
  }
  if (range.z !== undefined && range.z[0] > range.z[1]) {
    return {
      valid: false,
      error: `Invalid Z range: ${range.z[0]} > ${range.z[1]}`,
    };
  }
  return { valid: true };
}

/**
 * Validate that a cell range matches the pattern's dimension.
 */
export function validateCellRangeForPattern(
  range: CellRange,
  pattern: TilingPattern
): ValidationResult {
  if (pattern.dimension === 3 && range.z === undefined) {
    return {
      valid: false,
      error: "3D patterns require a Z range",
    };
  }
  return { valid: true };
}

/**
 * Check if the generated node count would be within reasonable limits.
 */
export function validateNodeCount(
  pattern: TilingPattern,
  range: CellRange,
  maxNodes = 1000
): ValidationResult {
  const xCount = range.x[1] - range.x[0] + 1;
  const yCount = range.y[1] - range.y[0] + 1;
  const zCount = range.z !== undefined ? range.z[1] - range.z[0] + 1 : 1;
  const nodeCount = xCount * yCount * zCount * pattern.unitCell.nodes.length;

  if (nodeCount > maxNodes) {
    return {
      valid: false,
      error: `Too many nodes: ${nodeCount} (max ${maxNodes}). Consider reducing the range.`,
    };
  }
  return { valid: true };
}

/**
 * Comprehensive validation of pattern and range before generation.
 */
export function validateTilingGeneration(
  pattern: TilingPattern,
  range: CellRange,
  options: {
    require2D?: boolean;
    require3D?: boolean;
    maxNodes?: number;
  } = {}
): ValidationResult {
  // Validate dimension requirements
  if (options.require2D) {
    const result = validateFor2D(pattern);
    if (!result.valid) return result;
  }
  if (options.require3D) {
    const result = validateFor3D(pattern);
    if (!result.valid) return result;
  }

  // Validate cell range
  const rangeResult = validateCellRange(range);
  if (!rangeResult.valid) return rangeResult;

  // Validate range matches pattern dimension
  const rangePatternResult = validateCellRangeForPattern(range, pattern);
  if (!rangePatternResult.valid) return rangePatternResult;

  // Validate node count
  if (options.maxNodes !== undefined) {
    const nodeCountResult = validateNodeCount(pattern, range, options.maxNodes);
    if (!nodeCountResult.valid) return nodeCountResult;
  }

  return { valid: true };
}
