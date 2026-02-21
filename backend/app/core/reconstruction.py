"""Core 3D reconstruction pipeline.

Implements stereo 3D reconstruction using:
  - SIFT feature detection and FLANN-based matching
  - RANSAC fundamental matrix estimation
  - Direct Linear Transformation (DLT) triangulation
  - Reprojection-error metrics

Ported and extended from the original 3d-recon/three_dim_rec.py script.
"""

import logging

import cv2
import numpy as np
from scipy import linalg

logger = logging.getLogger(__name__)


class Reconstruction3D:
    """Stereo 3D reconstruction via SIFT matching and DLT triangulation.

    Attributes:
        K1, K2: 3×3 intrinsic camera matrices.
        fund: Fundamental matrix estimated by RANSAC.
        proj1, proj2: 3×4 projection matrices for camera 1 and camera 2.
        imgPts1, imgPts2: Inlier matched keypoints (pixel coords before
            normalisation; normalised camera coords after).
        TriPts: Nx3 array of triangulated 3D points.
        colors: Nx3 array of per-point RGB colours (normalised 0–1).
        num_raw_matches: Number of good SIFT matches after ratio test.
        num_inliers: Number of inlier matches after RANSAC filtering.
    """

    def __init__(self, K1: np.ndarray, K2: np.ndarray) -> None:
        self.K1 = K1
        self.K2 = K2

        self.EssR1: np.ndarray | None = None
        self.EssR2: np.ndarray | None = None
        self.Ess_t: np.ndarray | None = None
        self.fund: np.ndarray | None = None
        self.proj1: np.ndarray | None = None
        self.proj2: np.ndarray | None = None
        self.imgPts1: np.ndarray | None = None
        self.imgPts2: np.ndarray | None = None
        self.TriPts: np.ndarray | None = None
        self.colors: np.ndarray | None = None

        self.num_raw_matches: int = 0
        self.num_inliers: int = 0

    # ------------------------------------------------------------------
    # Feature matching
    # ------------------------------------------------------------------

    def process_img_pair(self, img1: np.ndarray, img2: np.ndarray) -> None:
        """Detect SIFT features, match them, and estimate the fundamental matrix.

        Args:
            img1: Left image in BGR format (H×W×3 uint8).
            img2: Right image in BGR format (H×W×3 uint8).
        """
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        sift = cv2.SIFT_create()
        kps1, desc1 = sift.detectAndCompute(gray1, None)
        kps2, desc2 = sift.detectAndCompute(gray2, None)

        if desc1 is None or desc2 is None or len(kps1) < 8 or len(kps2) < 8:
            raise ValueError(
                "Insufficient keypoints detected. Ensure images have clear texture."
            )

        # FLANN matcher
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=50)
        flann = cv2.FlannBasedMatcher(index_params, search_params)
        matches = flann.knnMatch(desc1, desc2, k=2)

        # Lowe's ratio test
        good: list = []
        imgPts1: list = []
        imgPts2: list = []
        for m, n in matches:
            if m.distance < 0.7 * n.distance:
                good.append(m)
                imgPts1.append(kps1[m.queryIdx].pt)
                imgPts2.append(kps2[m.trainIdx].pt)

        self.num_raw_matches = len(good)
        logger.info("SIFT good matches after ratio test: %d", self.num_raw_matches)

        if self.num_raw_matches < 8:
            raise ValueError(
                f"Too few good matches ({self.num_raw_matches}). "
                "Need at least 8 for fundamental matrix estimation."
            )

        pts1 = np.float32(imgPts1)
        pts2 = np.float32(imgPts2)

        # Estimate fundamental matrix with RANSAC
        F, mask = cv2.findFundamentalMat(pts1, pts2, cv2.FM_RANSAC, 3.0, 0.99)
        if F is None:
            raise ValueError("Fundamental matrix estimation failed.")

        self.fund = F
        mask_flat = mask.ravel().astype(bool)
        self.imgPts1 = pts1[mask_flat]
        self.imgPts2 = pts2[mask_flat]
        self.num_inliers = int(mask_flat.sum())
        logger.info(
            "Inliers after RANSAC: %d / %d", self.num_inliers, self.num_raw_matches
        )

        # Extract pixel colours from img1 at inlier keypoint locations
        colors: list = []
        h, w = img1.shape[:2]
        for pt in self.imgPts1:
            x = int(np.clip(pt[0], 0, w - 1))
            y = int(np.clip(pt[1], 0, h - 1))
            b, g, r = img1[y, x]
            colors.append([r / 255.0, g / 255.0, b / 255.0])
        self.colors = np.array(colors, dtype=np.float32)

    # ------------------------------------------------------------------
    # Projection matrix computation
    # ------------------------------------------------------------------

    def _estimate_essential_matrix(self) -> np.ndarray:
        """Derive essential matrix from the fundamental matrix and intrinsics."""
        return self.K1.T @ self.fund @ self.K2

    def compute_proj_matrices(self) -> None:
        """Compute 3×4 projection matrices for both cameras."""
        # Camera 1 sits at the world origin
        cam1_ext = np.hstack((np.eye(3), np.zeros((3, 1))))
        self.proj1 = self.K1 @ cam1_ext

        # Camera 2 pose from essential matrix decomposition
        E = self._estimate_essential_matrix()
        self.EssR1, self.EssR2, self.Ess_t = cv2.decomposeEssentialMat(E)
        t2 = self.Ess_t.reshape(3, 1)
        cam2_ext = np.hstack((self.EssR2, t2))
        self.proj2 = self.K2 @ cam2_ext

    # ------------------------------------------------------------------
    # Keypoint normalisation
    # ------------------------------------------------------------------

    def normalize_keypts(self) -> None:
        """Convert matched keypoints from pixel to normalised camera coordinates."""
        hom1 = cv2.convertPointsToHomogeneous(self.imgPts1).reshape(-1, 3)
        hom2 = cv2.convertPointsToHomogeneous(self.imgPts2).reshape(-1, 3)

        K1_inv = np.linalg.inv(self.K1)
        K2_inv = np.linalg.inv(self.K2)

        norm1 = (K1_inv @ hom1.T).T
        norm2 = (K2_inv @ hom2.T).T

        self.imgPts1 = cv2.convertPointsFromHomogeneous(norm1).reshape(-1, 2)
        self.imgPts2 = cv2.convertPointsFromHomogeneous(norm2).reshape(-1, 2)

    # ------------------------------------------------------------------
    # Triangulation
    # ------------------------------------------------------------------

    def triangulate(self) -> None:
        """Triangulate matched points via DLT into 3D coordinates."""
        tris = [
            self._dlt_triangulate(p1, p2) for p1, p2 in zip(self.imgPts1, self.imgPts2)
        ]
        self.TriPts = np.vstack(tris)

    def _dlt_triangulate(self, pt1: np.ndarray, pt2: np.ndarray) -> np.ndarray:
        """Return a 3D point by DLT for one pair of correspondences.

        Args:
            pt1: 2D point in normalised camera 1 coordinates.
            pt2: 2D point in normalised camera 2 coordinates.

        Returns:
            Non-homogeneous 3D point [X, Y, Z].
        """
        P1, P2 = self.proj1, self.proj2
        A = np.array(
            [
                pt1[1] * P1[2, :] - P1[1, :],
                P1[0, :] - pt1[0] * P1[2, :],
                pt2[1] * P2[2, :] - P2[1, :],
                P2[0, :] - pt2[0] * P2[2, :],
            ]
        )
        B = A.T @ A
        _, _, Vh = linalg.svd(B, full_matrices=False)
        return Vh[3, :3] / Vh[3, 3]

    # ------------------------------------------------------------------
    # Metrics
    # ------------------------------------------------------------------

    def compute_reproj_error(self) -> float:
        """Return RMSE reprojection error onto the camera-2 image plane (pixels)."""
        rot_vec, _ = cv2.Rodrigues(self.EssR2)
        proj_pts, _ = cv2.projectPoints(self.TriPts, rot_vec, self.Ess_t, self.K2, None)
        residuals = self.imgPts2 - proj_pts.reshape(-1, 2)
        return float(np.mean(np.sqrt(np.sum(residuals**2, axis=-1))))

    def get_baseline_length(self) -> float:
        """Return the magnitude of the camera-to-camera translation vector."""
        return float(np.linalg.norm(self.Ess_t))

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(self, img1: np.ndarray, img2: np.ndarray) -> dict:
        """Execute the full reconstruction pipeline.

        Args:
            img1: Left stereo image (BGR uint8).
            img2: Right stereo image (BGR uint8).

        Returns:
            Dictionary with keys ``points``, ``colors``, and ``metrics``.
        """
        self.process_img_pair(img1, img2)
        # Save pixel-coord keypoints for reprojection metric later
        raw_pts2 = self.imgPts2.copy()

        self.normalize_keypts()
        self.compute_proj_matrices()
        self.triangulate()

        # Restore pixel-coord correspondences for reprojection error
        # (reproject TriPts and compare with original pixel positions)
        rot_vec, _ = cv2.Rodrigues(self.EssR2)
        proj_pts, _ = cv2.projectPoints(self.TriPts, rot_vec, self.Ess_t, self.K2, None)
        # Denormalise imgPts2 back to pixel space for error computation
        hom_norm2 = cv2.convertPointsToHomogeneous(raw_pts2).reshape(-1, 3)
        pixel_pts2 = (self.K2 @ hom_norm2.T).T
        pixel_pts2 = cv2.convertPointsFromHomogeneous(pixel_pts2).reshape(-1, 2)
        residuals = pixel_pts2 - proj_pts.reshape(-1, 2)
        reproj_rmse = float(np.mean(np.sqrt(np.sum(residuals**2, axis=-1))))

        depths = self.TriPts[:, 2]
        metrics = {
            "reprojection_rmse": reproj_rmse,
            "num_keypoints_matched": self.num_raw_matches,
            "num_inliers": self.num_inliers,
            "inlier_ratio": round(self.num_inliers / max(self.num_raw_matches, 1), 4),
            "num_3d_points": len(self.TriPts),
            "baseline_length": self.get_baseline_length(),
            "mean_depth": float(np.mean(depths)),
            "depth_range": float(np.max(depths) - np.min(depths)),
        }

        return {
            "points": self.TriPts.tolist(),
            "colors": self.colors.tolist(),
            "metrics": metrics,
        }
