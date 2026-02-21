import type { components } from "../api/schema";

export type ReconstructionMetrics = components["schemas"]["ReconstructionMetrics"];
export type ReconstructionResult = components["schemas"]["ReconstructionResponse"];

export type AppState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; result: ReconstructionResult }
  | { phase: "error"; message: string };
