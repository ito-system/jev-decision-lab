import { describe, expect, it, vi } from "vitest";
import { requestDecision } from "@/lib/request-decision";

describe("requestDecision（ブラウザ → /api/decide）", () => {
  it("/api/decide に JSON で POST し、レスポンスのボディを返す", async () => {
    const body = { ok: false, error: { code: "MISSING_API_KEY", message: "x", canUseDemo: true } };
    const fetchMock = vi.fn(async () => Response.json(body, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestDecision({ scenario: "qa", text: "テスト", mode: "mock" });

    expect(result).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decide",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ scenario: "qa", text: "テスト", mode: "mock" }),
      }),
    );
  });

  it("ページの URL に資格情報（https://user:pass@host）があっても呼べるよう、origin 基準の絶対 URL を使う", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    // location.origin には資格情報が含まれない
    vi.stubGlobal("location", { origin: "https://jev-decision-lab.example.workers.dev" });

    await requestDecision({ scenario: "voc", text: "テスト", mode: undefined });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://jev-decision-lab.example.workers.dev/api/decide",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("サーバーに届かなければ、接続エラーとして返す（Demo Mode でも続行できない）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const result = await requestDecision({ scenario: "qa", text: "テスト", mode: undefined });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CONNECTION_FAILED", canUseDemo: false },
    });
  });

  it("JSON 以外のレスポンス（プロキシのエラーページなど）でも例外を投げずにエラーとして返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Bad Gateway</html>", { status: 502 })),
    );

    const result = await requestDecision({ scenario: "voc", text: "テスト", mode: undefined });

    expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL_ERROR" } });
  });
});
