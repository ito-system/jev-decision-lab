import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { JevMode } from "@/lib/types";

/** 1回の判断で受け付けるテキストの最大文字数（前後の空白を除く） */
export const MAX_TEXT_LENGTH = 1000;

export interface DecideRequest {
  scenario: ScenarioId;
  text: string;
  /** "mock" を指定すると、サーバーが LIVE 設定でも Demo Mode で応答する */
  mode: JevMode | undefined;
}

export type ParseResult = { ok: true; value: DecideRequest } | { ok: false; message: string };

function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && Object.hasOwn(SCENARIOS, value);
}

function isJevMode(value: unknown): value is JevMode {
  return value === "live" || value === "mock";
}

export function parseDecideRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "リクエストの形式が正しくありません。" };
  }

  const { scenario, text, mode } = body as Record<string, unknown>;

  if (!isScenarioId(scenario)) {
    return { ok: false, message: "シナリオの指定が正しくありません。" };
  }

  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, message: "判断してほしいテキストを入力してください。" };
  }

  const trimmed = text.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      message: `テキストは${MAX_TEXT_LENGTH}文字以内で入力してください。`,
    };
  }

  if (mode !== undefined && !isJevMode(mode)) {
    return { ok: false, message: "mode の指定が正しくありません。" };
  }

  return { ok: true, value: { scenario, text: trimmed, mode } };
}
