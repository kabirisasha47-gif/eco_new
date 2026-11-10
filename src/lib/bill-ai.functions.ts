import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { extractBillFromImage, type BillExtractionResult } from "./ai-gateway.server";

/** ~6 MB of base64 — the client downsizes photos well below this. */
const MAX_DATA_URL_LENGTH = 8_000_000;

const inputSchema = z.object({
  imageDataUrl: z
    .string()
    .max(MAX_DATA_URL_LENGTH)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});

export const extractBill = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<BillExtractionResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { ok: false, status: 401, message: "سرویس هوش مصنوعی پیکربندی نشده است." };
    }
    return extractBillFromImage(apiKey, data.imageDataUrl);
  });
