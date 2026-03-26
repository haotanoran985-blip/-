import { NextResponse } from "next/server";

import { generateUiReview } from "@/lib/openai/ui-review-service";
import type { ReviewApiSuccess, ReviewContext } from "@/types/ui-review";

export const runtime = "nodejs";
export const maxDuration = 90;

const SERVER_REVIEW_TIMEOUT_MS = 90 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function isReviewContext(value: unknown): value is ReviewContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.interfaceType === "string" &&
    typeof maybe.primaryGoal === "string" &&
    typeof maybe.deviceType === "string" &&
    typeof maybe.designContext === "string" &&
    Array.isArray(maybe.priorities) &&
    maybe.priorities.every((item) => typeof item === "string")
  );
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
        reject(new Error("SERVER_REVIEW_TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();

  try {
    console.info("[ui-review][server] request started", {
      at: nowIso(),
      layer: "server",
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error("[ui-review] missing OPENAI_API_KEY");
      return jsonError("服务端未配置 OPENAI_API_KEY。", 500);
    }

    const formData = await request.formData();
    const screenshot = formData.get("screenshot");
    const rawContext = formData.get("context");

    if (!(screenshot instanceof File)) {
      return jsonError("缺少截图文件，请重新上传后再试。");
    }

    if (!screenshot.type.startsWith("image/")) {
      return jsonError("仅支持上传图片文件。");
    }

    console.info("[ui-review][server] request parsed", {
      at: nowIso(),
      layer: "server",
      fileName: screenshot.name,
      fileType: screenshot.type,
      fileSizeBytes: screenshot.size,
    });

    if (typeof rawContext !== "string") {
      return jsonError("缺少评审上下文。");
    }

    let context: ReviewContext;
    try {
      const parsed = JSON.parse(rawContext);
      if (!isReviewContext(parsed)) {
        return jsonError("评审上下文字段不完整。");
      }
      context = parsed;
    } catch {
      return jsonError("评审上下文解析失败。");
    }

    const fileBuffer = Buffer.from(await screenshot.arrayBuffer());
    const result = await withServerTimeout(
      generateUiReview({
        file: {
          name: screenshot.name,
          type: screenshot.type,
          buffer: fileBuffer,
        },
        context,
      }),
      SERVER_REVIEW_TIMEOUT_MS
    );

    const payload: ReviewApiSuccess = {
      ok: true,
      result,
    };

    console.info("[ui-review][server] request completed", {
      at: nowIso(),
      layer: "server",
      elapsedMs: Date.now() - requestStartedAt,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "评审服务暂时不可用。";
    console.error("[ui-review] request failed", error);

    if (message === "SERVER_REVIEW_TIMEOUT") {
      console.error("[ui-review][server] timeout", {
        at: nowIso(),
        layer: "server",
        elapsedMs: Date.now() - requestStartedAt,
        timeoutMs: SERVER_REVIEW_TIMEOUT_MS,
      });
      return jsonError("评审服务处理超时，请稍后重试。", 504);
    }

    if (message === "OPENAI_REQUEST_TIMEOUT") {
      console.error("[ui-review][server] timeout", {
        at: nowIso(),
        layer: "openai",
        elapsedMs: Date.now() - requestStartedAt,
      });
      return jsonError("OpenAI 评审请求超时，请稍后重试或换一张更小、更清晰的截图。", 504);
    }

    if (message === "OPENAI_EMPTY_OUTPUT") {
      return jsonError("OpenAI 未返回有效评审结果。", 502);
    }

    if (message === "OPENAI_INVALID_JSON") {
      return jsonError("OpenAI 返回的 JSON 格式无效。", 502);
    }

    if (message === "OPENAI_INVALID_REVIEW_RESULT") {
      return jsonError("OpenAI 返回的数据结构不符合预期。", 502);
    }

    return jsonError(message, 500);
  }
}
