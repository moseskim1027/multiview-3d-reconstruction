import type { ReconstructionResult } from "../types";

const BASE_URL = "/api";

/**
 * Send a stereo image pair (and optionally a calibration file) to the
 * backend reconstruction endpoint and return the structured result.
 */
export async function runReconstruction(
  im0: File,
  im1: File,
  calib?: File
): Promise<ReconstructionResult> {
  const form = new FormData();
  form.append("im0", im0);
  form.append("im1", im1);
  if (calib) form.append("calib", calib);

  const response = await fetch(`${BASE_URL}/reconstruct`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }

  return response.json() as Promise<ReconstructionResult>;
}
