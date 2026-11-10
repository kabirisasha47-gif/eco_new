import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import type { ExtractedBill } from "./bill-checks";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const BILL_MODEL = "openai/gpt-6-astra";
const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Request-scoped fetch that resends a gateway-issued run id; never mints one. */
function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

const confidence = z.enum(["high", "medium", "low"]);
const fieldEnum = z.enum(["billId", "period", "peakKwh", "midKwh", "lowKwh", "totalKwh", "amountRial", "general"]);

// Strict-compatible: single object root, every property required, optional values nullable.
const billSchema = z.object({
  isElectricityBill: z.boolean(),
  billId: z.string().nullable(),
  period: z.string().nullable(),
  periodDays: z.number().nullable(),
  peakKwh: z.number().nullable(),
  midKwh: z.number().nullable(),
  lowKwh: z.number().nullable(),
  totalKwh: z.number().nullable(),
  amountRial: z.number().nullable(),
  confidence: z.object({
    billId: confidence,
    period: confidence,
    peakKwh: confidence,
    midKwh: confidence,
    lowKwh: confidence,
    totalKwh: confidence,
    amountRial: confidence,
  }),
  issues: z.array(z.object({ field: fieldEnum, message: z.string() })),
});

const INSTRUCTIONS = `You read photos of Iranian electricity bills (قبض برق) for a solar-plant feasibility app.
Extract only what is printed on the bill. Never guess a value you cannot read; use null instead.
- billId: the 13-digit «شناسه قبض», digits only (convert Persian/Arabic digits to ASCII).
- period: the billing period in Persian, e.g. «مرداد تا مهر ۱۴۰۵». periodDays: number of days in the period if printed or computable, else null.
- peakKwh / midKwh / lowKwh: consumption for «اوج بار», «میان باری», «کم باری» in kWh as plain numbers.
- totalKwh: total consumption printed on the bill (kWh), else null.
- amountRial: the total payable amount in RIAL (if printed in toman, multiply by 10).
- confidence: per field, "low" when blurry, partially hidden, handwritten or ambiguous.
- issues: short Persian sentences (max 6) describing anything inconsistent or suspicious: tiers not adding up to the total, unreadable areas, amounts that look wrong, mismatched periods, signs the photo is not an electricity bill. Empty array if none.
- isElectricityBill: false if the image is not an electricity bill.
Do not include names, addresses or other personal data anywhere in the output.`;

export type BillExtractionResult =
  | { ok: true; bill: ExtractedBill }
  | { ok: false; status: number; message: string };

function findApiError(error: unknown): APICallError | null {
  let cur: unknown = error;
  for (let i = 0; i < 5 && cur; i++) {
    if (APICallError.isInstance(cur)) return cur;
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

function safeGatewayMessage(err: APICallError): string | null {
  try {
    const body = JSON.parse(err.responseBody ?? "{}") as { message?: string; error?: { message?: string } };
    return body.error?.message ?? body.message ?? null;
  } catch {
    return null;
  }
}

export async function extractBillFromImage(
  apiKey: string,
  imageDataUrl: string,
  signal?: AbortSignal,
): Promise<BillExtractionResult> {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(BILL_MODEL),
      instructions: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the bill data from this photo and list any inconsistencies." },
            { type: "image", image: new URL(imageDataUrl) },
          ],
        },
      ],
      output: Output.object({ schema: billSchema, name: "electricity_bill" }),
      maxRetries: 0,
      ...(signal ? { abortSignal: signal } : {}),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    // Drain the stream server-side, then read the validated object.
    for await (const _ of result.fullStream) {
      /* consume */
    }
    const output = await result.output;
    return { ok: true, bill: output as ExtractedBill };
  } catch (error) {
    const api = findApiError(error);
    if (api) {
      const status = api.statusCode ?? 500;
      const upstream = safeGatewayMessage(api);
      console.error("bill extraction gateway error", status, upstream);
      if (status === 402) {
        return { ok: false, status, message: upstream ?? "اعتبار هوش مصنوعی این برنامه تمام شده است." };
      }
      if (status === 429) {
        return { ok: false, status, message: "تعداد درخواست‌ها زیاد است؛ چند لحظه بعد دوباره تلاش کنید." };
      }
      if (status === 403) {
        return { ok: false, status, message: upstream ?? "دسترسی به سرویس هوش مصنوعی امکان‌پذیر نیست." };
      }
      if (status === 400) {
        return { ok: false, status, message: "تصویر قابل پردازش نیست؛ یک عکس واضح‌تر (JPG یا PNG) انتخاب کنید." };
      }
      return { ok: false, status, message: "سرویس خواندن قبض موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید." };
    }
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, status: 422, message: "اطلاعات قبض از این تصویر خوانده نشد؛ عکس واضح‌تری بگیرید." };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, status: 499, message: "خواندن قبض لغو شد." };
    }
    console.error("bill extraction failed", error);
    return { ok: false, status: 500, message: "خواندن قبض ناموفق بود؛ دوباره تلاش کنید." };
  }
}
