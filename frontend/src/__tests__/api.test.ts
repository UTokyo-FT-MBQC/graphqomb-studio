/**
 * API Client Tests
 *
 * Tests for the backend API client functions.
 */

import { checkHealth, computeZFlow, isApiError, schedule, validate } from "@/lib/api";
import type { ProjectPayload } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API Client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isApiError", () => {
    it("should return true for valid API error", () => {
      const error = { detail: "Not found", status: 404 };
      expect(isApiError(error)).toBe(true);
    });

    it("should return false for non-API error", () => {
      const error = new Error("Some error");
      expect(isApiError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isApiError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isApiError(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    const testPayload: ProjectPayload = {
      name: "Test",
      dimension: 2,
      nodes: [],
      edges: [],
      flow: { xflow: {}, zflow: "auto" },
    };

    it("should return validation result on success", async () => {
      const mockResponse = { valid: true, errors: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await validate(testPayload);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/validate"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(testPayload),
        })
      );
    });

    it("should return validation errors", async () => {
      const mockResponse = {
        valid: false,
        errors: [{ type: "validation", message: "Invalid flow" }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await validate(testPayload);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should throw ApiError on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Server error" }),
      });

      await expect(validate(testPayload)).rejects.toEqual({
        detail: "Server error",
        status: 500,
      });
    });
  });

  describe("schedule", () => {
    const testPayload: ProjectPayload = {
      name: "Test",
      dimension: 2,
      nodes: [],
      edges: [],
      flow: { xflow: {}, zflow: "auto" },
    };

    it("should return schedule result on success", async () => {
      const mockResponse = {
        prepareTime: {},
        measureTime: {},
        entangleTime: {},
        timeline: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await schedule(testPayload);

      expect(result).toEqual(mockResponse);
    });

    it("should use default strategy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await schedule(testPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("strategy=MINIMIZE_SPACE"),
        expect.any(Object)
      );
    });

    it("should use specified strategy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await schedule(testPayload, "MINIMIZE_TIME");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("strategy=MINIMIZE_TIME"),
        expect.any(Object)
      );
    });

    it("should throw ApiError on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ detail: "Schedule failed" }),
      });

      await expect(schedule(testPayload)).rejects.toEqual({
        detail: "Schedule failed",
        status: 400,
      });
    });
  });

  describe("computeZFlow", () => {
    const testPayload: ProjectPayload = {
      name: "Test",
      dimension: 2,
      nodes: [],
      edges: [],
      flow: { xflow: { n0: ["n1"] }, zflow: "auto" },
    };

    it("should return computed zflow", async () => {
      const mockResponse = { n0: ["n1"] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await computeZFlow(testPayload);

      expect(result).toEqual(mockResponse);
    });

    it("should return empty object for empty xflow", async () => {
      const emptyPayload: ProjectPayload = {
        ...testPayload,
        flow: { xflow: {}, zflow: "auto" },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await computeZFlow(emptyPayload);

      expect(result).toEqual({});
    });
  });

  describe("checkHealth", () => {
    it("should return true when backend is healthy", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await checkHealth();

      expect(result).toBe(true);
    });

    it("should return false when backend is unhealthy", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await checkHealth();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await checkHealth();

      expect(result).toBe(false);
    });
  });
});
