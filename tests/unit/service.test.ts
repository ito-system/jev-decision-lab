import { beforeEach, describe, expect, it, vi } from "vitest";
import { decide, JevServiceError } from "@/lib/jev/service";
import { SCENARIOS } from "@/lib/scenarios";
import {
  fakeJevApi,
  hangingJevApi,
  INQUIRY_API_RESPONSE,
  jsonResponse,
  unreachableJevApi,
} from "../support/fake-jev-api";

const TEST_KEY = "tsk_test_canary_7f3a9c";
const INQUIRY_TEXT = SCENARIOS.inquiry.defaultText;

// 実行環境の TYPESAFE_* 変数（モデルの固定など）が結果に混ざらないようにする
beforeEach(() => {
  vi.stubEnv("TYPESAFE_API_KEY", "");
  vi.stubEnv("TYPESAFE_DEFAULT_MODEL", "");
  vi.stubEnv("TYPESAFE_BASE_URL", "");
});

async function captureError(promise: Promise<unknown>): Promise<JevServiceError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof JevServiceError) return error;
    throw error;
  }
  throw new Error("decide() は失敗するはずでした");
}

describe("decide（live モード）", () => {
  it("3つの質問を1回の systemOne 呼び出しにまとめて Jev API へ送る", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
      { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
    );

    expect(api.requests).toHaveLength(1);
    const [request] = api.requests;
    expect(request.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(request.method).toBe("POST");
    expect(request.headers.authorization).toBe(`Bearer ${TEST_KEY}`);
    expect(request.body).toMatchObject({
      model: "jev-latest",
      state: { inquiry: INQUIRY_TEXT },
      questions: {
        category: { type: "choice" },
        urgent: { type: "noul" },
        impact: { type: "score" },
      },
    });
  });

  it("質問の criteria は画面に表示する候補・段階と同じ並び・数で送る", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
      { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
    );

    const body = api.requests[0].body as {
      questions: Record<string, { instructions: unknown; criteria: unknown }>;
    };
    expect(Object.keys(body.questions.category.criteria as object)).toEqual([
      "bug",
      "feature_request",
      "question",
      "billing",
      "other",
    ]);
    // SDK v0.6.0 以降、Score の criteria は「レベル 0 から順に並べた配列」
    expect(Array.isArray(body.questions.impact.criteria)).toBe(true);
    expect(body.questions.impact.criteria).toHaveLength(5);
  });

  it("画面に表示している質問文を、そのまま Jev に送る", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
      { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
    );

    const sent = JSON.stringify(api.requests[0].body);
    expect(sent).toContain("この問い合わせの主な種類は？");
    expect(sent).toContain("この問い合わせは緊急対応を検討すべき内容か？");
    expect(sent).toContain("ユーザーへの影響の大きさは？");
  });

  it("Jev のレスポンス（model・answers・usage）をそのまま結果として返す", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    const result = await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
      { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
    );

    expect(result).toMatchObject({
      scenario: "inquiry",
      mode: "live",
      model: "jev-1.13.0",
      answers: INQUIRY_API_RESPONSE.answers,
      usage: { input_tokens: 512, output_tokens: 40 },
      mockSource: null,
    });
    expect(result.latencyMs).toEqual(expect.any(Number));
    // 画面の「JSON を見る」に、実際に送ったモデル指定（SDK の既定 alias）も出す
    expect(result.request).toMatchObject({ model: "jev-latest", state: { inquiry: INQUIRY_TEXT } });
  });

  it("QA タブでは Noul と Score の2問を、画面と同じ state キーで送る", async () => {
    const api = fakeJevApi(() =>
      jsonResponse(200, {
        model: "jev-1.13.0",
        answers: {
          actionable: { type: "noul", noul: 0.12 },
          clarity: {
            type: "score",
            score: 0.2,
            legend: { "0": "a", "1": "b", "2": "c", "3": "d" },
            probabilities: { "0": 0.82, "1": 0.16, "2": 0.02, "3": 0 },
            confidence: 0.7,
          },
        },
        usage: { input_tokens: 300, output_tokens: 20 },
      }),
    );

    await decide(
      { scenario: "qa", text: "エラーが発生しました。", mode: "live" },
      { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
    );

    expect(api.requests[0].body).toMatchObject({
      state: { screen_message: "エラーが発生しました。" },
      questions: { actionable: { type: "noul" }, clarity: { type: "score" } },
    });
    expect(
      Object.keys((api.requests[0].body as { questions: object }).questions),
    ).toEqual(["actionable", "clarity"]);
  });

  it("APIキーが未設定なら Jev API を呼ばずに MISSING_API_KEY で失敗する", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { fetch: api.fetch } },
      ),
    );

    expect(error.code).toBe("MISSING_API_KEY");
    expect(api.requests).toHaveLength(0);
  });

  it("環境変数 TYPESAFE_API_KEY を APIキーとして使う", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", TEST_KEY);
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
      { clientConfig: { fetch: api.fetch } },
    );

    expect(api.requests[0].headers.authorization).toBe(`Bearer ${TEST_KEY}`);
  });

  it.each([
    [401, "AUTH_FAILED"],
    [403, "AUTH_FAILED"],
    [429, "RATE_LIMITED"],
    [500, "UPSTREAM_ERROR"],
    [529, "UPSTREAM_ERROR"],
    [422, "UPSTREAM_ERROR"],
  ] as const)("Jev API が %i を返したら %s として失敗する", async (status, code) => {
    const api = fakeJevApi(() =>
      jsonResponse(status, { error: { message: `upstream failure for ${TEST_KEY}` } }),
    );

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch, retry: { maxRetries: 0 } } },
      ),
    );

    expect(error.code).toBe(code);
  });

  it("エラーメッセージに APIキーや Jev API の内部メッセージを含めない", async () => {
    const api = fakeJevApi(() =>
      jsonResponse(401, { error: { message: `Invalid API key: ${TEST_KEY}` } }),
    );

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch, retry: { maxRetries: 0 } } },
      ),
    );

    expect(error.message).not.toContain(TEST_KEY);
    expect(error.message).not.toContain("Invalid API key");
  });

  it("接続できなければ CONNECTION_FAILED として失敗する", async () => {
    const api = unreachableJevApi();

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch, retry: { maxRetries: 0 } } },
      ),
    );

    expect(error.code).toBe("CONNECTION_FAILED");
  });

  it("タイムアウトしたら CONNECTION_FAILED として失敗する", async () => {
    const api = hangingJevApi();

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        {
          clientConfig: {
            apiKey: TEST_KEY,
            fetch: api.fetch,
            timeout: 20,
            retry: { maxRetries: 0 },
          },
        },
      ),
    );

    expect(error.code).toBe("CONNECTION_FAILED");
  });

  it("想定した質問の回答が欠けたレスポンスは UPSTREAM_ERROR として扱う", async () => {
    const partialAnswers = Object.fromEntries(
      Object.entries(INQUIRY_API_RESPONSE.answers).filter(([key]) => key !== "urgent"),
    );
    const api = fakeJevApi(() =>
      jsonResponse(200, { ...INQUIRY_API_RESPONSE, answers: partialAnswers }),
    );

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
      ),
    );

    expect(error.code).toBe("UPSTREAM_ERROR");
  });

  it("回答の type が質問と食い違うレスポンスは UPSTREAM_ERROR として扱う", async () => {
    const api = fakeJevApi(() =>
      jsonResponse(200, {
        ...INQUIRY_API_RESPONSE,
        answers: { ...INQUIRY_API_RESPONSE.answers, urgent: { type: "score", score: 1 } },
      }),
    );

    const error = await captureError(
      decide(
        { scenario: "inquiry", text: INQUIRY_TEXT, mode: "live" },
        { clientConfig: { apiKey: TEST_KEY, fetch: api.fetch } },
      ),
    );

    expect(error.code).toBe("UPSTREAM_ERROR");
  });
});

describe("decide（mock モード）", () => {
  it("Jev API を呼ばず、APIキーがなくても事前定義のサンプル値を返す", async () => {
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));

    const result = await decide(
      { scenario: "inquiry", text: INQUIRY_TEXT, mode: "mock" },
      { clientConfig: { fetch: api.fetch } },
    );

    expect(api.requests).toHaveLength(0);
    expect(result).toMatchObject({
      scenario: "inquiry",
      mode: "mock",
      mockSource: "preset",
      usage: null,
      latencyMs: null,
    });
    expect(result.model).not.toMatch(/^jev-/);
    expect(Object.keys(result.answers)).toEqual(["category", "urgent", "impact"]);
  });

  it("送るはずだったリクエスト（state と質問）も結果に含める", async () => {
    const result = await decide({ scenario: "voc", text: "使いやすいです", mode: "mock" });

    expect(result.request.state).toEqual({ feedback: "使いやすいです" });
    expect(Object.keys(result.request.questions)).toEqual([
      "category",
      "dissatisfaction",
      "worth_improving",
    ]);
  });
});
