export interface ReconstructionMetrics {
  reprojection_rmse: number;
  num_keypoints_matched: number;
  num_inliers: number;
  inlier_ratio: number;
  num_3d_points: number;
  baseline_length: number;
  mean_depth: number;
  depth_range: number;
}

export interface ReconstructionResult {
  points: [number, number, number][];
  colors: [number, number, number][];
  metrics: ReconstructionMetrics;
}

export type AppState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; result: ReconstructionResult }
  | { phase: "error"; message: string };
