import type { ScenarioId } from "@/lib/scenarios";
import type { DecideResponseBody, JevMode } from "@/lib/types";

// ブラウザから自前のサーバー API（/api/decide）を呼ぶ。Jev API を直接は呼ばない。

export interface DecisionRequest {
  scenario: ScenarioId;
  text: string;
  /** "mock" を指定すると Demo Mode で応答する */
  mode: JevMode | undefined;
}

export async function requestDecision(request: DecisionRequest): Promise<DecideResponseBody> {
  let response: Response;
  try {
    response = await fetch("/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "CONNECTION_FAILED",
        message: "サーバーに接続できませんでした。ネットワークを確認してください。",
        canUseDemo: false,
      },
    };
  }

  try {
    return (await response.json()) as DecideResponseBody;
  } catch {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `サーバーから想定外の応答がありました（HTTP ${response.status}）。`,
        canUseDemo: true,
      },
    };
  }
}
