/**
 * Validation Utilities
 *
 * Functions for validating and parsing project data.
 */

import { safeValidateProject, validateProject } from "@/schemas/project";
import type { Project } from "@/schemas/project";
import type { GraphQOMBProject } from "@/types";

export { validateProject, safeValidateProject };

/**
 * Parse JSON string to Project
 */
export function parseProject(jsonString: string): Project {
  const data: unknown = JSON.parse(jsonString);
  return validateProject(data);
}

/**
 * Safely parse JSON string to Project
 */
export function safeParseProject(
  jsonString: string
): { success: true; data: Project } | { success: false; error: Error } {
  try {
    const data: unknown = JSON.parse(jsonString);
    const result = safeValidateProject(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: new Error(result.error.message) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Serialize Project to JSON string
 */
export function serializeProject(project: GraphQOMBProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Download project as JSON file
 */
export function downloadProject(project: GraphQOMBProject, filename?: string): void {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${project.name.replace(/\s+/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load project from file
 */
export async function loadProjectFromFile(file: File): Promise<Project> {
  const text = await file.text();
  return parseProject(text);
}
