"""Unit and integration tests for the reconstruction pipeline."""

import io
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.utils import parse_middlebury_calib, bytes_to_bgr, estimate_intrinsics
from app.core.reconstruction import Reconstruction3D


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_CALIB = (
    "cam0=[3997.684 0 1176.728; 0 3997.684 1011.728; 0 0 1]\n"
    "cam1=[3997.684 0 1176.728; 0 3997.684 1011.728; 0 0 1]\n"
    "doffs=0\n"
    "baseline=193.001\n"
)

K_EXPECTED = np.array(
    [[3997.684, 0, 1176.728], [0, 3997.684, 1011.728], [0, 0, 1]], dtype=np.float64
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def random_bgr_image():
    """Return a reproducible 200×300 random BGR image as a numpy array."""
    rng = np.random.default_rng(42)
    return rng.integers(0, 256, (200, 300, 3), dtype=np.uint8)


# ---------------------------------------------------------------------------
# utils tests
# ---------------------------------------------------------------------------


def test_parse_middlebury_calib_basic():
    K1, K2 = parse_middlebury_calib(SAMPLE_CALIB)
    np.testing.assert_allclose(K1, K_EXPECTED, rtol=1e-5)
    np.testing.assert_allclose(K2, K_EXPECTED, rtol=1e-5)


def test_parse_middlebury_calib_missing_matrix():
    with pytest.raises(ValueError, match="at least two"):
        parse_middlebury_calib("cam0=[1 0 0; 0 1 0; 0 0 1]\n")


def test_estimate_intrinsics(random_bgr_image):
    K = estimate_intrinsics(random_bgr_image)
    assert K.shape == (3, 3)
    h, w = random_bgr_image.shape[:2]
    assert K[0, 0] == max(h, w)  # focal length heuristic


def test_bytes_to_bgr_invalid():
    with pytest.raises(ValueError, match="Could not decode"):
        bytes_to_bgr(b"not an image")


# ---------------------------------------------------------------------------
# API health check
# ---------------------------------------------------------------------------


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body


# ---------------------------------------------------------------------------
# Reconstruction – error cases (no real images needed)
# ---------------------------------------------------------------------------


def test_reconstruct_missing_files(client):
    """Endpoint must return 422 when no files are uploaded."""
    resp = client.post("/api/reconstruct")
    assert resp.status_code == 422


def test_reconstruct_invalid_image(client):
    """Endpoint must return 422 when uploaded bytes are not a valid image."""
    files = {
        "im0": ("im0.png", b"garbage", "image/png"),
        "im1": ("im1.png", b"garbage", "image/png"),
    }
    resp = client.post("/api/reconstruct", files=files)
    assert resp.status_code == 422
