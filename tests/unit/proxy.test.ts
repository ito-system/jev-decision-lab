import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

function request(path: string, authorization?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: authorization ? { authorization } : {},
  });
}

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;

/** proxy がリクエストを先へ通したか（NextResponse.next() の目印） */
const passedThrough = (response: Response) => response.headers.get("x-middleware-next") === "1";

beforeEach(() => {
  vi.stubEnv("BASIC_AUTH_USER", "");
  vi.stubEnv("BASIC_AUTH_PASSWORD", "");
  vi.stubEnv("BASIC_AUTH_REQUIRED", "");
});

describe("proxy（Basic 認証）", () => {
  it("BASIC_AUTH_PASSWORD が未設定なら認証なしで通す", () => {
    expect(passedThrough(proxy(request("/")))).toBe(true);
  });

  describe("BASIC_AUTH_USER / BASIC_AUTH_PASSWORD を設定したとき", () => {
    beforeEach(() => {
      vi.stubEnv("BASIC_AUTH_USER", "jev");
      vi.stubEnv("BASIC_AUTH_PASSWORD", "s3cret:pass");
    });

    it.each(["/", "/api/decide"])("%s に認証ヘッダーがなければ 401 で認証を求める", (path) => {
      const response = proxy(request(path));

      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toMatch(/^Basic /);
    });

    it.each([
      ["パスワード違い", basic("jev", "wrong")],
      ["ユーザー名違い", basic("someone", "s3cret:pass")],
      ["Basic 以外の方式", "Bearer s3cret:pass"],
      ["Base64 として壊れている", "Basic %%%"],
    ])("%s なら 401", (_case, authorization) => {
      expect(proxy(request("/", authorization)).status).toBe(401);
    });

    it("正しいユーザー名とパスワード（':' を含む）なら通す", () => {
      expect(passedThrough(proxy(request("/", basic("jev", "s3cret:pass"))))).toBe(true);
    });
  });

  describe("BASIC_AUTH_REQUIRED=true（Cloudflare などの公開環境）", () => {
    beforeEach(() => {
      vi.stubEnv("BASIC_AUTH_REQUIRED", "true");
    });

    it.each(["/", "/api/decide"])(
      "パスワードが未設定なら %s を 503 で止める（APIキーを第三者に使わせない）",
      (path) => {
        const response = proxy(request(path, basic("anyone", "")));

        expect(response.status).toBe(503);
        expect(passedThrough(response)).toBe(false);
      },
    );

    it("パスワードを設定すれば、通常どおり Basic 認証で判定する", () => {
      vi.stubEnv("BASIC_AUTH_PASSWORD", "pw");

      expect(proxy(request("/")).status).toBe(401);
      expect(passedThrough(proxy(request("/", basic("anyone", "pw"))))).toBe(true);
    });
  });

  it("BASIC_AUTH_USER が未設定なら、パスワードだけで判定する", () => {
    vi.stubEnv("BASIC_AUTH_PASSWORD", "only-password");

    expect(passedThrough(proxy(request("/", basic("anyone", "only-password"))))).toBe(true);
    expect(proxy(request("/", basic("anyone", "wrong"))).status).toBe(401);
  });
});
