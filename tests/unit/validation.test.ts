import { describe, expect, it } from "vitest";
import { MAX_TEXT_LENGTH, parseDecideRequest } from "@/lib/validation";

describe("parseDecideRequest", () => {
  it("既知のシナリオを受け付け、テキスト前後の空白を取り除く", () => {
    const result = parseDecideRequest({ scenario: "inquiry", text: "  ログインできません\n" });

    expect(result).toEqual({
      ok: true,
      value: { scenario: "inquiry", text: "ログインできません", mode: undefined },
    });
  });

  it.each([null, "inquiry", 42, ["inquiry", "text"]])(
    "オブジェクト以外のボディ（%j）は拒否する",
    (body) => {
      const result = parseDecideRequest(body);

      expect(result.ok).toBe(false);
    },
  );

  it.each(["sales", "", "toString", "__proto__", "constructor"])(
    "未知のシナリオ（%j）は拒否する",
    (scenario) => {
      const result = parseDecideRequest({ scenario, text: "テスト" });

      expect(result.ok).toBe(false);
    },
  );

  it.each([undefined, 123, "", "   \n\t "])("テキストが空・文字列以外（%j）なら拒否する", (text) => {
    const result = parseDecideRequest({ scenario: "qa", text });

    expect(result.ok).toBe(false);
  });

  it("上限ちょうどの長さは受け付け、上限を1文字でも超えたら拒否する", () => {
    const atLimit = parseDecideRequest({ scenario: "voc", text: "あ".repeat(MAX_TEXT_LENGTH) });
    const overLimit = parseDecideRequest({
      scenario: "voc",
      text: "あ".repeat(MAX_TEXT_LENGTH + 1),
    });

    expect(atLimit.ok).toBe(true);
    expect(overLimit.ok).toBe(false);
  });

  it("上限は前後の空白を除いた長さで判定する", () => {
    const result = parseDecideRequest({
      scenario: "voc",
      text: `  ${"あ".repeat(MAX_TEXT_LENGTH)}  `,
    });

    expect(result.ok).toBe(true);
  });

  it.each(["live", "mock"] as const)("mode に %s を指定できる", (mode) => {
    const result = parseDecideRequest({ scenario: "qa", text: "テスト", mode });

    expect(result).toEqual({ ok: true, value: { scenario: "qa", text: "テスト", mode } });
  });

  it.each(["demo", "MOCK", 1, null])("mode が不正な値（%j）なら拒否する", (mode) => {
    const result = parseDecideRequest({ scenario: "qa", text: "テスト", mode });

    expect(result.ok).toBe(false);
  });

  it("拒否するときは画面に出せる日本語のメッセージを返す", () => {
    const result = parseDecideRequest({ scenario: "unknown", text: "テスト" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/[ぁ-んァ-ヶ一-龠]/);
    }
  });
});
