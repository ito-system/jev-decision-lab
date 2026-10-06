import { basicAuthFailure } from "@/lib/basic-auth";
import { getServerMode, resolveMode } from "@/lib/jev/config";
import { describeForLog, toJevServiceError } from "@/lib/jev/errors";
import { decide } from "@/lib/jev/service";
import type { DecideResponseBody } from "@/lib/types";
import { parseDecideRequest } from "@/lib/validation";

// ブラウザ → この API → Jev Service → 公式 SDK → Jev API。
// APIキーはサーバーの環境変数にだけ置き、ブラウザから Jev API を直接呼ばない。

function reply(status: number, body: DecideResponseBody): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function invalidRequest(message: string): Response {
  return reply(400, {
    ok: false,
    error: { code: "INVALID_REQUEST", message, canUseDemo: false },
  });
}

export async function POST(request: Request): Promise<Response> {
  // proxy.ts だけに頼らず、APIキーを使うこの API でも認証を確かめる
  const denied = basicAuthFailure(request.headers.get("authorization"));
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("リクエストの形式が正しくありません。");
  }

  const parsed = parseDecideRequest(body);
  if (!parsed.ok) return invalidRequest(parsed.message);

  const { scenario, text } = parsed.value;
  const mode = resolveMode(getServerMode(), parsed.value.mode);

  try {
    const result = await decide({ scenario, text, mode });
    return reply(200, { ok: true, result });
  } catch (error) {
    const serviceError = toJevServiceError(error);
    console.error("[jev] decide failed", describeForLog(serviceError));
    return reply(serviceError.status, { ok: false, error: serviceError.toPublic() });
  }
}
