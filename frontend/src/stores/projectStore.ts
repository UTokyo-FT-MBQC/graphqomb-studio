/**
 * Project Store
 *
 * Main state store for the GraphQOMB project.
 * Includes persistence to localStorage.
 */

import type {
  FTQCDefinition,
  FlowDefinition,
  GraphEdge,
  GraphNode,
  GraphQOMBProject,
  ScheduleResult,
} from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
  project: GraphQOMBProject;

  // Actions
  setProject: (project: GraphQOMBProject) => void;
  setProjectName: (name: string) => void;
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

  // FTQC Actions
  updateFTQC: (ftqc: FTQCDefinition | undefined) => void;
  addParityCheckGroup: (group: string[]) => void;
  removeParityCheckGroup: (index: number) => void;
  updateParityCheckGroup: (index: number, group: string[]) => void;
  setLogicalObservable: (key: string, targets: string[]) => void;
  removeLogicalObservable: (key: string) => void;
}

function createInitialProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Untitled",
    nodes: [],
    edges: [],
    flow: { xflow: {}, zflow: "auto" },
    ftqc: undefined,
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
            nodes: state.project.nodes.map((n) =>
              n.id === id ? ({ ...n, ...updates } as GraphNode) : n
            ),
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

          // Remove node from FTQC entries
          let newFtqc: FTQCDefinition | undefined = undefined;
          if (state.project.ftqc !== undefined) {
            const newParityCheckGroup = state.project.ftqc.parityCheckGroup
              .map((group) => group.filter((nodeId) => nodeId !== id))
              .filter((group) => group.length > 0);

            const newLogicalObservableGroup: Record<string, string[]> = {};
            for (const [key, targets] of Object.entries(
              state.project.ftqc.logicalObservableGroup
            )) {
              const filtered = targets.filter((nodeId) => nodeId !== id);
              if (filtered.length > 0) {
                newLogicalObservableGroup[key] = filtered;
              }
            }

            // Only keep ftqc if there's still data
            if (
              newParityCheckGroup.length > 0 ||
              Object.keys(newLogicalObservableGroup).length > 0
            ) {
              newFtqc = {
                parityCheckGroup: newParityCheckGroup,
                logicalObservableGroup: newLogicalObservableGroup,
              };
            }
          }

          return {
            project: {
              ...state.project,
              nodes: state.project.nodes.filter((n) => n.id !== id),
              edges: state.project.edges.filter((e) => e.source !== id && e.target !== id),
              flow: { xflow: newXflow, zflow: newZflow },
              ftqc: newFtqc,
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

      // FTQC Actions
      updateFTQC: (ftqc: FTQCDefinition | undefined): void => {
        set((state) => ({
          project: { ...state.project, ftqc },
        }));
      },

      addParityCheckGroup: (group: string[]): void => {
        set((state) => {
          const currentFtqc = state.project.ftqc ?? {
            parityCheckGroup: [],
            logicalObservableGroup: {},
          };
          return {
            project: {
              ...state.project,
              ftqc: {
                ...currentFtqc,
                parityCheckGroup: [...currentFtqc.parityCheckGroup, group],
              },
            },
          };
        });
      },

      removeParityCheckGroup: (index: number): void => {
        set((state) => {
          if (state.project.ftqc === undefined) return state;
          const newGroups = state.project.ftqc.parityCheckGroup.filter((_, i) => i !== index);
          // If no more data, set ftqc to undefined
          if (
            newGroups.length === 0 &&
            Object.keys(state.project.ftqc.logicalObservableGroup).length === 0
          ) {
            return { project: { ...state.project, ftqc: undefined } };
          }
          return {
            project: {
              ...state.project,
              ftqc: { ...state.project.ftqc, parityCheckGroup: newGroups },
            },
          };
        });
      },

      updateParityCheckGroup: (index: number, group: string[]): void => {
        set((state) => {
          if (state.project.ftqc === undefined) return state;
          const newGroups = [...state.project.ftqc.parityCheckGroup];
          newGroups[index] = group;
          return {
            project: {
              ...state.project,
              ftqc: { ...state.project.ftqc, parityCheckGroup: newGroups },
            },
          };
        });
      },

      setLogicalObservable: (key: string, targets: string[]): void => {
        set((state) => {
          const currentFtqc = state.project.ftqc ?? {
            parityCheckGroup: [],
            logicalObservableGroup: {},
          };
          return {
            project: {
              ...state.project,
              ftqc: {
                ...currentFtqc,
                logicalObservableGroup: {
                  ...currentFtqc.logicalObservableGroup,
                  [key]: targets,
                },
              },
            },
          };
        });
      },

      removeLogicalObservable: (key: string): void => {
        set((state) => {
          if (state.project.ftqc === undefined) return state;
          const { [key]: _, ...rest } = state.project.ftqc.logicalObservableGroup;
          // If no more data, set ftqc to undefined
          if (state.project.ftqc.parityCheckGroup.length === 0 && Object.keys(rest).length === 0) {
            return { project: { ...state.project, ftqc: undefined } };
          }
          return {
            project: {
              ...state.project,
              ftqc: { ...state.project.ftqc, logicalObservableGroup: rest },
            },
          };
        });
      },

      reset: (): void => {
        set({ project: createInitialProject() });
      },
    }),
    { name: "graphqomb-project" }
  )
);
