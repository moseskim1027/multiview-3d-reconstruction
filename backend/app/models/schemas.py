from pydantic import BaseModel, Field


class ReconstructionMetrics(BaseModel):
    reprojection_rmse: float = Field(
        description="Root-mean-square reprojection error in pixels (cam2 plane)."
    )
    num_keypoints_matched: int = Field(
        description="Number of good SIFT matches after Lowe's ratio test."
    )
    num_inliers: int = Field(
        description="Number of inlier correspondences after RANSAC fundamental matrix estimation."
    )
    inlier_ratio: float = Field(
        description="Fraction of SIFT matches that survived RANSAC filtering (0–1)."
    )
    num_3d_points: int = Field(
        description="Number of successfully triangulated 3D points."
    )
    baseline_length: float = Field(
        description="Estimated camera baseline length (magnitude of translation vector)."
    )
    mean_depth: float = Field(
        description="Mean depth (Z coordinate) of the reconstructed point cloud."
    )
    depth_range: float = Field(
        description="Depth range (max Z − min Z) of the reconstructed point cloud."
    )


class ReconstructionResponse(BaseModel):
    points: list[list[float]] = Field(
        description="Reconstructed 3D points as [[x, y, z], ...]."
    )
    colors: list[list[float]] = Field(
        description="Per-point RGB colours normalised to [0, 1] as [[r, g, b], ...]."
    )
    metrics: ReconstructionMetrics


class HealthResponse(BaseModel):
    status: str
    version: str
