// Jev API（https://api.typesafe.ai）の代わりに応答する fetch。
// 公式 SDK の `fetch` オプション（またはグローバル fetch）に差し込み、SDK 本体はそのまま動かす。

export interface RecordedRequest {
  url: string;
  method: string | undefined;
  headers: Record<string, string>;
  body: unknown;
}

export interface FakeJevApi {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  requests: RecordedRequest[];
}

type Reply = () => Response | Promise<Response>;

function record(requests: RecordedRequest[], input: string, init?: RequestInit) {
  requests.push({
    url: input,
    method: init?.method,
    headers: Object.fromEntries(new Headers(init?.headers).entries()),
    body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
  });
}

export function fakeJevApi(reply: Reply): FakeJevApi {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetch: async (input, init) => {
      record(requests, input, init);
      return reply();
    },
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-typesafe-request-id": "req_test_123" },
  });
}

/** 接続できない（DNS 失敗・オフラインなど）状況 */
export function unreachableJevApi(): FakeJevApi {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetch: async (input, init) => {
      record(requests, input, init);
      throw new TypeError("fetch failed");
    },
  };
}

/** 応答が返ってこない状況。SDK のタイムアウトで中断されるまで待つ。 */
export function hangingJevApi(): FakeJevApi {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetch: (input, init) => {
      record(requests, input, init);
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    },
  };
}

/** 問い合わせタブの質問に対する、公式 API リファレンスと同じ構造のレスポンス */
export const INQUIRY_API_RESPONSE = {
  model: "jev-1.13.0",
  answers: {
    category: {
      type: "choice",
      choice: "bug",
      probabilities: { bug: 0.9, feature_request: 0.01, question: 0.02, billing: 0.05, other: 0.02 },
      confidence: 0.875,
    },
    urgent: { type: "noul", noul: 0.87 },
    impact: {
      type: "score",
      score: 3.7,
      legend: {
        "0": "影響はほぼない",
        "1": "軽微な不便がある",
        "2": "主要機能の一部が利用できない",
        "3": "主要機能が利用できない",
        "4": "多数ユーザーまたは重要機能に重大な影響",
      },
      probabilities: { "0": 0, "1": 0, "2": 0.05, "3": 0.2, "4": 0.75 },
      confidence: 0.6,
    },
  },
  usage: { input_tokens: 512, output_tokens: 40 },
};
