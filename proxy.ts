import { NextResponse, type NextRequest } from "next/server";
import { basicAuthFailure } from "@/lib/basic-auth";

// 公開時の Basic 認証をページ全体にかける（Next.js 16 では middleware が proxy に改名された）。
// 判定の中身と環境変数は lib/basic-auth.ts を参照。/api/decide でも同じ判定を行う。
export function proxy(request: NextRequest): Response {
  return basicAuthFailure(request.headers.get("authorization")) ?? NextResponse.next();
}

export const config = {
  // 静的ファイル以外（ページと /api/decide）すべてに適用する
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
