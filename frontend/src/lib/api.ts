/**
 * API Client for GraphQOMB Studio Backend
 *
 * Functions for communicating with the FastAPI backend.
 */

import type { ProjectPayload, ScheduleResult } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// === Error Types ===

export interface ApiError {
  detail: string;
  status: number;
}

export interface ValidationError {
  type: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// === Type Guards ===

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "detail" in error && "status" in error;
}

// === API Request Helper ===

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail: string;
    try {
      const errorData = (await response.json()) as { detail?: string };
      detail = errorData.detail ?? response.statusText;
    } catch {
      detail = response.statusText;
    }

    const error: ApiError = {
      detail,
      status: response.status,
    };
    throw error;
  }

  return response.json() as Promise<T>;
}

// === API Functions ===

/**
 * Validate a project's graph and flow.
 *
 * @param payload - The project payload to validate.
 * @returns Validation result with valid flag and any errors.
 */
export async function validate(payload: ProjectPayload): Promise<ValidationResult> {
  return apiRequest<ValidationResult>("/api/validate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Compute a measurement schedule for the project.
 *
 * @param payload - The project payload to schedule.
 * @param strategy - Optimization strategy (default: MINIMIZE_SPACE).
 * @returns The computed schedule result.
 */
export async function schedule(
  payload: ProjectPayload,
  strategy: "MINIMIZE_SPACE" | "MINIMIZE_TIME" = "MINIMIZE_SPACE"
): Promise<ScheduleResult> {
  return apiRequest<ScheduleResult>(`/api/schedule?strategy=${strategy}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Compute z-flow from x-flow using odd_neighbors algorithm.
 *
 * @param payload - The project payload containing the graph and x-flow.
 * @returns The computed z-flow mapping.
 */
export async function computeZFlow(payload: ProjectPayload): Promise<Record<string, string[]>> {
  return apiRequest<Record<string, string[]>>("/api/compute-zflow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Check if the backend is healthy.
 *
 * @returns True if the backend is responding.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
