/**
 * Project Store
 *
 * Main state store for the GraphQOMB project.
 * Includes persistence to localStorage.
 */

import type { FlowDefinition, GraphEdge, GraphNode, GraphQOMBProject, ScheduleResult } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
  project: GraphQOMBProject;

  // Actions
  setProject: (project: GraphQOMBProject) => void;
  setProjectName: (name: string) => void;
  setDimension: (dimension: 2 | 3) => void;
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (id: string) => void;
  updateFlow: (flow: FlowDefinition) => void;
  updateXFlow: (nodeId: string, targets: string[]) => void;
  setSchedule: (schedule: ScheduleResult) => void;
  clearSchedule: () => void;
  reset: () => void;
}

function createInitialProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Untitled",
    dimension: 2,
    nodes: [],
    edges: [],
    flow: { xflow: {}, zflow: "auto" },
    schedule: undefined,
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: createInitialProject(),

      setProject: (project: GraphQOMBProject): void => {
        set({ project });
      },

      setProjectName: (name: string): void => {
        set((state) => ({
          project: { ...state.project, name },
        }));
      },

      setDimension: (dimension: 2 | 3): void => {
        set((state) => ({
          project: { ...state.project, dimension, schedule: undefined },
        }));
      },

      addNode: (node: GraphNode): void => {
        set((state) => ({
          project: {
            ...state.project,
            nodes: [...state.project.nodes, node],
            schedule: undefined,
          },
        }));
      },

      updateNode: (id: string, updates: Partial<GraphNode>): void => {
        set((state) => ({
          project: {
            ...state.project,
            nodes: state.project.nodes.map((n) => (n.id === id ? ({ ...n, ...updates } as GraphNode) : n)),
            schedule: undefined,
          },
        }));
      },

      removeNode: (id: string): void => {
        set((state) => {
          // Remove node from xflow and zflow entries
          const newXflow: Record<string, string[]> = {};
          for (const [key, targets] of Object.entries(state.project.flow.xflow)) {
            if (key !== id) {
              newXflow[key] = targets.filter((t) => t !== id);
            }
          }

          let newZflow: Record<string, string[]> | "auto";
          if (state.project.flow.zflow === "auto") {
            newZflow = "auto";
          } else {
            const zf: Record<string, string[]> = {};
            for (const [key, targets] of Object.entries(state.project.flow.zflow)) {
              if (key !== id) {
                zf[key] = targets.filter((t) => t !== id);
              }
            }
            newZflow = zf;
          }

          return {
            project: {
              ...state.project,
              nodes: state.project.nodes.filter((n) => n.id !== id),
              edges: state.project.edges.filter((e) => e.source !== id && e.target !== id),
              flow: { xflow: newXflow, zflow: newZflow },
              schedule: undefined,
            },
          };
        });
      },

      addEdge: (edge: GraphEdge): void => {
        set((state) => {
          // Check for duplicate edges
          const exists = state.project.edges.some((e) => e.id === edge.id);
          if (exists) {
            return state;
          }
          return {
            project: {
              ...state.project,
              edges: [...state.project.edges, edge],
              schedule: undefined,
            },
          };
        });
      },

      removeEdge: (id: string): void => {
        set((state) => ({
          project: {
            ...state.project,
            edges: state.project.edges.filter((e) => e.id !== id),
            schedule: undefined,
          },
        }));
      },

      updateFlow: (flow: FlowDefinition): void => {
        set((state) => ({
          project: {
            ...state.project,
            flow,
            schedule: undefined,
          },
        }));
      },

      updateXFlow: (nodeId: string, targets: string[]): void => {
        set((state) => ({
          project: {
            ...state.project,
            flow: {
              ...state.project.flow,
              xflow: {
                ...state.project.flow.xflow,
                [nodeId]: targets,
              },
            },
            schedule: undefined,
          },
        }));
      },

      setSchedule: (schedule: ScheduleResult): void => {
        set((state) => ({
          project: { ...state.project, schedule },
        }));
      },

      clearSchedule: (): void => {
        set((state) => ({
          project: { ...state.project, schedule: undefined },
        }));
      },

      reset: (): void => {
        set({ project: createInitialProject() });
      },
    }),
    { name: "graphqomb-project" }
  )
);
