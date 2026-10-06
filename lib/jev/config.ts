import "server-only";

import type { JevMode } from "@/lib/types";

type Env = Record<string, string | undefined>;

/**
 * JEV_DEMO_MODE からサーバーのモードを決める。
 * 未設定なら live。live / mock 以外の値は、誤って Jev API を呼ばないよう mock として扱う。
 */
export function getServerMode(env: Env = process.env): JevMode {
  const value = env.JEV_DEMO_MODE?.trim().toLowerCase();
  if (!value || value === "live") return "live";
  if (value !== "mock") {
    console.warn(`[jev] JEV_DEMO_MODE="${env.JEV_DEMO_MODE}" は不明な値のため mock で動作します`);
  }
  return "mock";
}

/** ブラウザからは mock への切り替えだけを受け付ける（サーバーが mock なら live にはしない） */
export function resolveMode(serverMode: JevMode, requested: JevMode | undefined): JevMode {
  return serverMode === "mock" || requested === "mock" ? "mock" : "live";
}
