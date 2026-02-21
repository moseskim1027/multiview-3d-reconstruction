import createClient from "openapi-fetch";

import type { paths } from "./schema";
import type { ReconstructionResult } from "../types";

const client = createClient<paths>({ baseUrl: "" });

/**
 * Send a stereo image pair (and optionally a calibration file) to the
 * backend reconstruction endpoint and return the structured result.
 *
 * File objects are serialised into a multipart/form-data body; the
 * OpenAPI schema represents binary fields as `string` so we close over
 * the originals in the bodySerializer rather than relying on the typed body.
 */
export async function runReconstruction(
  im0: File,
  im1: File,
  calib?: File
): Promise<ReconstructionResult> {
  const { data, error } = await client.POST("/api/reconstruct", {
    // Cast required: schema types binary fields as string, but we send Files
    body: { im0, im1, calib } as unknown as {
      im0: string;
      im1: string;
      calib?: string;
    },
    bodySerializer() {
      const form = new FormData();
      form.append("im0", im0);
      form.append("im1", im1);
      if (calib) form.append("calib", calib);
      return form;
    },
  });

  if (error) {
    const detail = (error as { detail?: string }).detail;
    throw new Error(detail ?? "Reconstruction failed");
  }

  return data;
}
