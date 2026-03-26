import { NextResponse } from "next/server";

import { generateStylePrompt } from "@/lib/openai/style-prompt-service";
import type { StylePromptApiSuccess } from "@/types/style-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SERVER_STYLE_PROMPT_TIMEOUT_MS = 90 * 1000;

type StylePromptPayload = {
  mimeType?: unknown;
  imageBase64?: unknown;
  fileName?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function withServerTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timerId) {
        clearTimeout(timerId);
      }
    }),
    new Promise<T>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error("SERVER_STYLE_PROMPT_TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
}

function normalizePayload(body: StylePromptPayload | null) {
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "";
  const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const fileName =
    typeof body?.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim()
      : "uploaded-image";

  const normalizedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

  if (!mimeType.startsWith("image/") || !normalizedBase64) {
    return null;
  }

  return {
    mimeType,
    imageBase64: normalizedBase64,
    fileName,
  };
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();

  try {
    console.info("[style-prompt][server] request started", {
      at: nowIso(),
      layer: "server",
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error("[style-prompt] missing OPENAI_API_KEY");
      return jsonError("服务端未配置 OPENAI_API_KEY。", 500);
    }

    let body: StylePromptPayload | null;
    try {
      body = (await request.json()) as StylePromptPayload;
    } catch {
      return jsonError("请求体不是有效 JSON。", 400);
    }

    const payload = normalizePayload(body);
    if (!payload) {
      return jsonError("缺少图片数据，请先上传图片。", 400);
    }

    const fileBuffer = Buffer.from(payload.imageBase64, "base64");
    if (!fileBuffer.length) {
      return jsonError("图片数据为空，请重新上传后再试。", 400);
    }

    console.info("[style-prompt][server] request parsed", {
      at: nowIso(),
      layer: "server",
      fileName: payload.fileName,
      fileType: payload.mimeType,
      fileSizeBytes: fileBuffer.length,
    });

    const result = await withServerTimeout(
      generateStylePrompt({
        file: {
          name: payload.fileName,
          type: payload.mimeType,
          buffer: fileBuffer,
        },
      }),
      SERVER_STYLE_PROMPT_TIMEOUT_MS
    );

    const responsePayload: StylePromptApiSuccess = {
      ok: true,
      result,
    };

    console.info("[style-prompt][server] request completed", {
      at: nowIso(),
      layer: "server",
      elapsedMs: Date.now() - requestStartedAt,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "风格提示词服务暂时不可用。";
    console.error("[style-prompt] request failed", error);

    if (message === "SERVER_STYLE_PROMPT_TIMEOUT") {
      console.error("[style-prompt][server] timeout", {
        at: nowIso(),
        layer: "server",
        elapsedMs: Date.now() - requestStartedAt,
        timeoutMs: SERVER_STYLE_PROMPT_TIMEOUT_MS,
      });
      return jsonError("风格提示词服务处理超时，请稍后重试。", 504);
    }

    if (message === "OPENAI_REQUEST_TIMEOUT") {
      console.error("[style-prompt][server] timeout", {
        at: nowIso(),
        layer: "openai",
        elapsedMs: Date.now() - requestStartedAt,
      });
      return jsonError("OpenAI 风格分析请求超时，请稍后重试或换一张更清晰的图片。", 504);
    }

    if (message === "OPENAI_EMPTY_OUTPUT") {
      return jsonError("OpenAI 未返回有效风格分析结果。", 502);
    }

    if (message === "OPENAI_INVALID_JSON") {
      return jsonError("OpenAI 返回的 JSON 格式无效。", 502);
    }

    if (message === "OPENAI_INVALID_STYLE_PROMPT_RESULT") {
      return jsonError("OpenAI 返回的风格提示词数据结构不符合预期。", 502);
    }

    return jsonError(message, 500);
  }
}
