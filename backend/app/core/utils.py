import re

import cv2
import numpy as np


def parse_middlebury_calib(content: str) -> tuple[np.ndarray, np.ndarray]:
    """Parse Middlebury-format calib.txt content into intrinsic matrices.

    Expected format (first two lines):
        cam0=[f 0 cx; 0 f cy; 0 0 1]
        cam1=[f 0 cx; 0 f cy; 0 0 1]

    Args:
        content: Raw text content of the calibration file.

    Returns:
        Tuple of (K1, K2) intrinsic matrices as 3x3 float64 arrays.
    """
    lines = content.strip().splitlines()
    matrices = []
    for line in lines[:2]:
        match = re.search(r"\[(.+)\]", line)
        if not match:
            raise ValueError(f"Cannot parse calibration line: {line!r}")
        inner = match.group(1).replace(";", " ")
        values = [float(v) for v in inner.split()]
        if len(values) != 9:
            raise ValueError(f"Expected 9 values in camera matrix, got {len(values)}")
        matrices.append(np.array(values, dtype=np.float64).reshape(3, 3))
    if len(matrices) < 2:
        raise ValueError("Calibration file must contain at least two camera matrices.")
    return matrices[0], matrices[1]


def bytes_to_bgr(data: bytes) -> np.ndarray:
    """Decode raw image bytes into a BGR numpy array (OpenCV format).

    Args:
        data: Raw bytes of an image file (PNG, JPEG, etc.).

    Returns:
        BGR image as a uint8 numpy array of shape (H, W, 3).

    Raises:
        ValueError: If the bytes cannot be decoded as an image.
    """
    buf = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes. Ensure the file is a valid image.")
    return img


def estimate_intrinsics(img: np.ndarray) -> np.ndarray:
    """Estimate a plausible intrinsic matrix from image dimensions.

    Uses the heuristic that focal length ≈ max(width, height) and the
    principal point is at the image centre.  Suitable as a fallback when
    no calibration file is provided.

    Args:
        img: BGR image array.

    Returns:
        3x3 intrinsic matrix.
    """
    h, w = img.shape[:2]
    f = max(h, w)
    cx, cy = w / 2.0, h / 2.0
    K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], dtype=np.float64)
    return K
