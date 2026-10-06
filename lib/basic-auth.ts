// 公開 URL で動かすときの任意の Basic 認証。
// proxy.ts（ページ全体）と /api/decide（APIキーで Jev を呼ぶ処理）の両方で確かめる。
// Cloudflare では proxy.ts のサポートが実験的なため、API 側でも必ず確認する。
//
// - BASIC_AUTH_PASSWORD を設定すると有効。BASIC_AUTH_USER を設定した場合はユーザー名も照合する
// - BASIC_AUTH_REQUIRED=true（Cloudflare の wrangler.jsonc で指定）のときは、
//   パスワードが未設定のまま公開されないよう、すべてのリクエストを止める

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function readCredentials(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const bytes = Uint8Array.from(atob(header.slice("Basic ".length).trim()), (c) =>
      c.charCodeAt(0),
    );
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

/** 認証に通らなければ返すべきレスポンス（401 / 503）、通れば null */
export function basicAuthFailure(authorization: string | null): Response | null {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) {
    if (process.env.BASIC_AUTH_REQUIRED !== "true") return null;
    return new Response(
      "Basic 認証が未設定のため停止しています。BASIC_AUTH_PASSWORD を設定してください。",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const user = process.env.BASIC_AUTH_USER;
  const credentials = readCredentials(authorization);
  const authorized =
    credentials !== null &&
    constantTimeEqual(credentials.password, password) &&
    (!user || constantTimeEqual(credentials.user, user));
  if (authorized) return null;

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Jev Decision Lab", charset="UTF-8"' },
  });
}
