import { NextResponse, type NextRequest } from "next/server";

// 公開 URL で動かすときの任意の Basic 認証（Next.js 16 では middleware が proxy に改名された）。
// /api/decide はサーバーの APIキーで Jev を呼ぶため、公開時は第三者に使われないよう保護する。
// BASIC_AUTH_PASSWORD を設定すると有効になる。BASIC_AUTH_USER を設定した場合はユーザー名も照合する。

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

export function proxy(request: NextRequest): NextResponse {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.BASIC_AUTH_USER;
  const credentials = readCredentials(request.headers.get("authorization"));
  const authorized =
    credentials !== null &&
    constantTimeEqual(credentials.password, password) &&
    (!user || constantTimeEqual(credentials.user, user));

  if (authorized) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Jev Decision Lab", charset="UTF-8"' },
  });
}

export const config = {
  // 静的ファイル以外（ページと /api/decide）すべてに適用する
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
