/**
 * Measurement Basis Editor
 *
 * Allows editing of measurement basis for input/intermediate nodes.
 * Supports two modes:
 * - Planner: plane (XY/YZ/XZ) + angleCoeff
 * - Axis: axis (X/Y/Z) + sign (PLUS/MINUS)
 */

"use client";

import type { Axis, MeasBasis, Plane, Sign } from "@/types";
import { getAngle } from "@/types";
import type { ChangeEvent } from "react";
import { useCallback, useId, useMemo } from "react";

interface MeasBasisEditorProps {
  basis: MeasBasis;
  onChange: (basis: MeasBasis) => void;
}

// Format angle for display
function formatAngle(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  const roundedDegrees = Math.round(degrees * 100) / 100;

  // Try to express as fraction of π
  const piMultiple = radians / Math.PI;
  const fractions = [
    { num: 0, denom: 1, label: "0" },
    { num: 1, denom: 4, label: "π/4" },
    { num: 1, denom: 2, label: "π/2" },
    { num: 3, denom: 4, label: "3π/4" },
    { num: 1, denom: 1, label: "π" },
    { num: 5, denom: 4, label: "5π/4" },
    { num: 3, denom: 2, label: "3π/2" },
    { num: 7, denom: 4, label: "7π/4" },
    { num: 2, denom: 1, label: "2π" },
  ];

  for (const frac of fractions) {
    if (Math.abs(piMultiple - frac.num / frac.denom) < 0.001) {
      return `${frac.label} (${roundedDegrees}°)`;
    }
  }

  return `${radians.toFixed(4)} rad (${roundedDegrees}°)`;
}

export function MeasBasisEditor({ basis, onChange }: MeasBasisEditorProps): React.ReactNode {
  const id = useId();

  // Handle mode change (planner/axis)
  const handleModeChange = useCallback(
    (mode: "planner" | "axis") => {
      if (mode === "planner") {
        onChange({
          type: "planner",
          plane: "XY",
          angleCoeff: 0,
        });
      } else {
        onChange({
          type: "axis",
          axis: "X",
          sign: "PLUS",
        });
      }
    },
    [onChange]
  );

  // Handle planner plane change
  const handlePlaneChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      if (basis.type !== "planner") return;
      onChange({
        ...basis,
        plane: e.target.value as Plane,
      });
    },
    [basis, onChange]
  );

  // Handle planner angle coefficient change
  const handleAngleCoeffChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (basis.type !== "planner") return;
      const value = Number.parseFloat(e.target.value);
      if (!Number.isNaN(value)) {
        onChange({
          ...basis,
          angleCoeff: value,
        });
      }
    },
    [basis, onChange]
  );

  // Handle axis change
  const handleAxisChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      if (basis.type !== "axis") return;
      onChange({
        ...basis,
        axis: e.target.value as Axis,
      });
    },
    [basis, onChange]
  );

  // Handle sign change
  const handleSignChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      if (basis.type !== "axis") return;
      onChange({
        ...basis,
        sign: e.target.value as Sign,
      });
    },
    [basis, onChange]
  );

  // Calculate actual angle for preview
  const anglePreview = useMemo(() => {
    return formatAngle(getAngle(basis));
  }, [basis]);

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-2">Measurement Basis</span>

      {/* Mode Toggle */}
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`${id}-mode`}
            checked={basis.type === "planner"}
            onChange={() => handleModeChange("planner")}
            className="w-4 h-4"
          />
          <span className="text-sm">Planner</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`${id}-mode`}
            checked={basis.type === "axis"}
            onChange={() => handleModeChange("axis")}
            className="w-4 h-4"
          />
          <span className="text-sm">Axis</span>
        </label>
      </div>

      {/* Planner Mode */}
      {basis.type === "planner" && (
        <div className="space-y-2">
          <div>
            <label htmlFor={`${id}-plane`} className="block text-xs text-gray-500 mb-1">
              Plane
            </label>
            <select
              id={`${id}-plane`}
              value={basis.plane}
              onChange={handlePlaneChange}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="XY">XY</option>
              <option value="YZ">YZ</option>
              <option value="XZ">XZ</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${id}-angle`} className="block text-xs text-gray-500 mb-1">
              Angle (2π × a)
            </label>
            <input
              id={`${id}-angle`}
              type="number"
              step="0.125"
              value={basis.angleCoeff}
              onChange={handleAngleCoeffChange}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">→ {anglePreview}</div>
        </div>
      )}

      {/* Axis Mode */}
      {basis.type === "axis" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${id}-axis`} className="block text-xs text-gray-500 mb-1">
                Axis
              </label>
              <select
                id={`${id}-axis`}
                value={basis.axis}
                onChange={handleAxisChange}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="X">X</option>
                <option value="Y">Y</option>
                <option value="Z">Z</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${id}-sign`} className="block text-xs text-gray-500 mb-1">
                Sign
              </label>
              <select
                id={`${id}-sign`}
                value={basis.sign}
                onChange={handleSignChange}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="PLUS">+ (PLUS)</option>
                <option value="MINUS">- (MINUS)</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">→ {anglePreview}</div>
        </div>
      )}
    </div>
  );
}
