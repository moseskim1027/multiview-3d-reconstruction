"""Reconstruction API route handlers."""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.reconstruction import Reconstruction3D
from app.core.utils import bytes_to_bgr, estimate_intrinsics, parse_middlebury_calib
from app.models.schemas import ReconstructionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reconstruct", tags=["reconstruction"])


@router.post("", response_model=ReconstructionResponse)
async def reconstruct(
    im0: UploadFile = File(..., description="Left stereo image (PNG/JPEG)."),
    im1: UploadFile = File(..., description="Right stereo image (PNG/JPEG)."),
    calib: UploadFile = File(
        None,
        description=(
            "Middlebury-format calib.txt file.  "
            "If omitted, intrinsics are estimated from image dimensions."
        ),
    ),
) -> ReconstructionResponse:
    """Run the full stereo 3D reconstruction pipeline.

    Upload a stereo image pair (and optionally a calibration file) to receive:
    - A list of triangulated 3D points with per-point RGB colours.
    - Reconstruction quality metrics (reprojection error, inlier ratio, etc.).
    """
    try:
        img1_bytes = await im0.read()
        img2_bytes = await im1.read()

        img1 = bytes_to_bgr(img1_bytes)
        img2 = bytes_to_bgr(img2_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Image decoding failed: {exc}"
        ) from exc

    # Resolve intrinsic matrices
    try:
        if calib is not None:
            calib_text = (await calib.read()).decode("utf-8")
            K1, K2 = parse_middlebury_calib(calib_text)
        else:
            logger.warning(
                "No calibration file provided; estimating intrinsics from image size."
            )
            K1 = estimate_intrinsics(img1)
            K2 = estimate_intrinsics(img2)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Calibration parsing failed: {exc}"
        ) from exc

    # Run reconstruction
    try:
        rec = Reconstruction3D(K1, K2)
        result = rec.run(img1, img2)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during reconstruction")
        raise HTTPException(
            status_code=500, detail=f"Reconstruction failed: {exc}"
        ) from exc

    return ReconstructionResponse(**result)
