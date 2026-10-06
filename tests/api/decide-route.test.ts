import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/decide/route";
import type { DecideResponseBody } from "@/lib/types";
import { fakeJevApi, INQUIRY_API_RESPONSE, jsonResponse } from "../support/fake-jev-api";

const TEST_KEY = "tsk_test_canary_route_51d0";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function read(response: Response): Promise<{ raw: string; body: DecideResponseBody }> {
  const raw = await response.text();
  return { raw, body: JSON.parse(raw) as DecideResponseBody };
}

beforeEach(() => {
  vi.stubEnv("TYPESAFE_API_KEY", "");
  vi.stubEnv("TYPESAFE_DEFAULT_MODEL", "");
  vi.stubEnv("TYPESAFE_BASE_URL", "");
  vi.stubEnv("BASIC_AUTH_USER", "");
  vi.stubEnv("BASIC_AUTH_PASSWORD", "");
  vi.stubEnv("BASIC_AUTH_REQUIRED", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// proxy.ts（Cloudflare では実験的なサポート）が動かなくても、APIキーを使う API 自体で認証を確かめる
describe("POST /api/decide（Basic 認証）", () => {
  const body = { scenario: "qa", text: "テスト", mode: "mock" };
  const withAuth = (authorization: string) =>
    POST(
      new Request("http://localhost/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json", authorization },
        body: JSON.stringify(body),
      }),
    );

  it("BASIC_AUTH_PASSWORD を設定していて認証ヘッダーがなければ 401", async () => {
    vi.stubEnv("BASIC_AUTH_PASSWORD", "pw");

    const response = await post(body);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toMatch(/^Basic /);
  });

  it("正しい資格情報なら判断結果を返す", async () => {
    vi.stubEnv("BASIC_AUTH_PASSWORD", "pw");

    const response = await withAuth(`Basic ${Buffer.from("anyone:pw").toString("base64")}`);

    expect(response.status).toBe(200);
  });

  it("BASIC_AUTH_REQUIRED=true でパスワードが未設定なら 503 で止める", async () => {
    vi.stubEnv("BASIC_AUTH_REQUIRED", "true");

    const response = await post(body);

    expect(response.status).toBe(503);
  });
});

describe("POST /api/decide", () => {
  it("JEV_DEMO_MODE=mock なら Demo Mode の結果を返す", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "mock");

    const response = await post({ scenario: "inquiry", text: "ログインできません" });
    const { body } = await read(response);

    expect(response.status).toBe(200);
    expect(body.ok && body.result.mode).toBe("mock");
  });

  it("JSON として読めないボディは 400 INVALID_REQUEST", async () => {
    const response = await post("{not json");
    const { body } = await read(response);

    expect(response.status).toBe(400);
    expect(!body.ok && body.error.code).toBe("INVALID_REQUEST");
  });

  it("バリデーションに通らない入力は 400 INVALID_REQUEST で、Demo Mode を勧めない", async () => {
    const response = await post({ scenario: "sales", text: "テスト" });
    const { body } = await read(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST", canUseDemo: false } });
  });

  it("live で APIキーが未設定なら 503 MISSING_API_KEY を返し、Demo Mode を勧める", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "live");

    const response = await post({ scenario: "qa", text: "エラーが発生しました。" });
    const { body } = await read(response);

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, error: { code: "MISSING_API_KEY", canUseDemo: true } });
  });

  it("サーバーが live でも、mode: mock を指定すれば APIキーなしで Demo Mode の結果を返す", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "live");

    const response = await post({ scenario: "voc", text: "使いにくいです", mode: "mock" });
    const { body } = await read(response);

    expect(response.status).toBe(200);
    expect(body.ok && body.result.mode).toBe("mock");
  });

  it("サーバーが mock なら、mode: live を指定しても Jev API を呼ばない", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "mock");
    vi.stubEnv("TYPESAFE_API_KEY", TEST_KEY);
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));
    vi.stubGlobal("fetch", api.fetch);

    const response = await post({ scenario: "inquiry", text: "テスト", mode: "live" });
    const { body } = await read(response);

    expect(body.ok && body.result.mode).toBe("mock");
    expect(api.requests).toHaveLength(0);
  });

  it("live では公式 SDK 経由で Jev API を呼び、その結果を返す", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "live");
    vi.stubEnv("TYPESAFE_API_KEY", TEST_KEY);
    const api = fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE));
    vi.stubGlobal("fetch", api.fetch);

    const response = await post({ scenario: "inquiry", text: "決済できません" });
    const { body } = await read(response);

    expect(response.status).toBe(200);
    expect(api.requests).toHaveLength(1);
    expect(body).toMatchObject({
      ok: true,
      result: { mode: "live", model: "jev-1.13.0", answers: INQUIRY_API_RESPONSE.answers },
    });
  });

  it("Jev API の認証エラーは 502 AUTH_FAILED にし、APIキーや内部メッセージをブラウザへ返さない", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "live");
    vi.stubEnv("TYPESAFE_API_KEY", TEST_KEY);
    const api = fakeJevApi(() =>
      jsonResponse(401, { error: { message: `Invalid API key: ${TEST_KEY}` } }),
    );
    vi.stubGlobal("fetch", api.fetch);

    const response = await post({ scenario: "inquiry", text: "決済できません" });
    const { raw, body } = await read(response);

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, error: { code: "AUTH_FAILED", canUseDemo: true } });
    expect(raw).not.toContain(TEST_KEY);
    expect(raw).not.toContain("Invalid API key");
  });

  it("成功時のレスポンスにも APIキーを含めない", async () => {
    vi.stubEnv("JEV_DEMO_MODE", "live");
    vi.stubEnv("TYPESAFE_API_KEY", TEST_KEY);
    vi.stubGlobal("fetch", fakeJevApi(() => jsonResponse(200, INQUIRY_API_RESPONSE)).fetch);

    const { raw } = await read(await post({ scenario: "inquiry", text: "決済できません" }));

    expect(raw).not.toContain(TEST_KEY);
  });
});
