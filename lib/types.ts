// UI とサーバーで共有する型。SDK からは型だけを import する（実行時コードはバンドルされない）。
import type {
  ChoiceResponse,
  NoulResponse,
  Questions,
  ScoreResponse,
  Usage,
} from "@typesafe-ai/sdk";
import type { ScenarioId } from "@/lib/scenarios";

/** live: Jev API を呼ぶ / mock: 事前定義のサンプル値を返す（API は呼ばない） */
export type JevMode = "live" | "mock";

export type JevAnswer = ChoiceResponse | NoulResponse | ScoreResponse;

/** preset: プリセットに対応する事前定義の値 / heuristic: キーワードから作った簡易サンプル */
export type MockSource = "preset" | "heuristic";

export interface DecisionResult {
  scenario: ScenarioId;
  mode: JevMode;
  /** live: 回答したモデルのバージョン（例: jev-1.13.0）/ mock: Jev ではないことを示す名前 */
  model: string;
  /** 質問 ID ごとの回答。Jev API のレスポンスと同じ構造 */
  answers: Record<string, JevAnswer>;
  usage: Usage | null;
  /** live のみ: Jev API の呼び出しにかかった時間（ミリ秒） */
  latencyMs: number | null;
  mockSource: MockSource | null;
  /** Jev に送ったリクエスト（mock では送るはずだったもの。model は live のときだけ入る） */
  request: { state: Record<string, string>; questions: Questions; model?: string };
}

export type DecideErrorCode =
  | "INVALID_REQUEST"
  | "MISSING_API_KEY"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "CONNECTION_FAILED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface DecideError {
  code: DecideErrorCode;
  /** 画面に表示してよいメッセージ（APIキーや内部エラーの詳細は含めない） */
  message: string;
  /** Demo Mode に切り替えれば続行できるか */
  canUseDemo: boolean;
}

export type DecideResponseBody =
  | { ok: true; result: DecisionResult }
  | { ok: false; error: DecideError };
