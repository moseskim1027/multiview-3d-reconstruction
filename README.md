# Multiview 3D Reconstruction

A containerised full-stack application for stereo 3D reconstruction.  Upload a left/right image pair and an optional calibration file to get an interactive, colour-accurate point cloud rendered in your browser.

---

## Architecture

```
multiview-3d-reconstruction/
├── backend/          FastAPI + OpenCV reconstruction pipeline
├── frontend/         React + Three.js 3D point cloud viewer
├── docker-compose.yml          Production stack
└── docker-compose.dev.yml      Development stack (hot-reload)
```

### Backend
- **FastAPI** REST API — `POST /api/reconstruct`, `GET /api/health`
- SIFT feature matching → RANSAC fundamental matrix → DLT triangulation
- Returns 3D points with per-point RGB colours and quality metrics

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Three.js** via `@react-three/fiber` for GPU-accelerated point cloud rendering
- `OrbitControls` for drag/zoom/pan navigation
- Metrics panel (reprojection RMSE, inlier ratio, point cloud stats)

---

## Quick start

### Docker (recommended)

```bash
docker compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

### Development (hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Frontend dev server: http://localhost:5173

---

## API

### `POST /api/reconstruct`

| Field    | Type | Required | Description |
|----------|------|----------|-------------|
| `im0`    | file | Yes | Left stereo image (PNG/JPEG) |
| `im1`    | file | Yes | Right stereo image (PNG/JPEG) |
| `calib`  | file | No  | Middlebury-format `calib.txt` |

**Response**
```json
{
  "points": [[x, y, z], ...],
  "colors": [[r, g, b], ...],
  "metrics": {
    "reprojection_rmse": 1.23,
    "num_keypoints_matched": 512,
    "num_inliers": 380,
    "inlier_ratio": 0.742,
    "num_3d_points": 380,
    "baseline_length": 0.045,
    "mean_depth": 0.012,
    "depth_range": 0.031
  }
}
```

### Calibration file format (Middlebury)

```
cam0=[f 0 cx; 0 f cy; 0 0 1]
cam1=[f 0 cx; 0 f cy; 0 0 1]
```

---

## Reconstruction metrics

| Metric | Description |
|--------|-------------|
| `reprojection_rmse` | RMSE reprojection error in pixels (cam-2 plane). Lower is better. |
| `num_keypoints_matched` | Good SIFT matches after Lowe's ratio test (threshold 0.7). |
| `num_inliers` | Matches consistent with the RANSAC fundamental matrix. |
| `inlier_ratio` | `num_inliers / num_keypoints_matched`. Higher means more reliable scene. |
| `num_3d_points` | Total triangulated 3D points. |
| `baseline_length` | Camera separation (translation vector magnitude). |
| `mean_depth` | Average scene depth (Z coordinate). |
| `depth_range` | Depth extent of the point cloud. |

---

## Running tests

**Backend**
```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

**Frontend**
```bash
cd frontend
yarn install
yarn type-check
yarn lint
```

---

## CI/CD

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | Push to `develop`, PRs to `develop`/`main` | Lint → Test → Docker build |
| `cd.yml` | Push to `main` | Build and deploy to production |
| `pr-checks.yml` | PRs to `develop`/`main` | Semantic title, branch naming, size check |
