import "server-only";

import { ENV, TypeSafeClient, type TypeSafeClientConfig } from "@typesafe-ai/sdk";
import { JevServiceError, toJevServiceError } from "@/lib/jev/errors";
import { getMockAnswers } from "@/lib/jev/mock";
import { buildJevRequest } from "@/lib/jev/questions";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { DecisionResult, JevAnswer, JevMode } from "@/lib/types";

export { JevServiceError } from "@/lib/jev/errors";

// Jev Service: UI から独立した「state + 質問 → 型付きの判断」の窓口。
// live では公式 SDK（@typesafe-ai/sdk）の systemOne を1回だけ呼び、全質問をまとめて評価する。
// モデルは指定せず SDK の既定（jev-latest。TYPESAFE_DEFAULT_MODEL で固定も可能）を使う。

/** mock の結果に入れるモデル名。Jev の応答と取り違えないよう jev- で始めない */
export const MOCK_MODEL_NAME = "demo-mock";

// ライブデモで長く待たせないよう、SDK の既定（10秒・リトライ2回・Retry-After 最大60秒）より短くする
const LIVE_CLIENT_DEFAULTS = {
  timeout: 8_000,
  retry: { maxRetries: 1, maxRetryAfterMs: 3_000 },
} satisfies TypeSafeClientConfig;

export interface DecideInput {
  scenario: ScenarioId;
  text: string;
  mode: JevMode;
}

export interface DecideDeps {
  /** SDK クライアントの設定を上書きする（テストで fetch や apiKey を差し替える） */
  clientConfig?: TypeSafeClientConfig;
}

export async function decide(input: DecideInput, deps: DecideDeps = {}): Promise<DecisionResult> {
  const request = buildJevRequest(input.scenario, input.text);

  if (input.mode === "mock") {
    const { answers, source } = getMockAnswers(input.scenario, input.text);
    return {
      scenario: input.scenario,
      mode: "mock",
      model: MOCK_MODEL_NAME,
      answers,
      usage: null,
      latencyMs: null,
      mockSource: source,
      request,
    };
  }

  const client = createClient(deps.clientConfig);
  const started = performance.now();
  try {
    const response = await client.systemOne(request);
    const latencyMs = Math.round(performance.now() - started);
    return {
      scenario: input.scenario,
      mode: "live",
      model: response.model,
      answers: checkAnswers(input.scenario, response.answers),
      usage: response.usage,
      latencyMs,
      mockSource: null,
      // model は SDK が補う既定値（jev-latest、または TYPESAFE_DEFAULT_MODEL）
      request: { ...request, model: client.defaultModel },
    };
  } catch (error) {
    throw toJevServiceError(error);
  }
}

function createClient(config: TypeSafeClientConfig = {}): TypeSafeClient {
  const apiKey = config.apiKey ?? process.env[ENV.apiKey];
  if (!apiKey?.trim()) throw new JevServiceError("MISSING_API_KEY");
  try {
    return new TypeSafeClient({
      ...LIVE_CLIENT_DEFAULTS,
      ...config,
      retry: { ...LIVE_CLIENT_DEFAULTS.retry, ...config.retry },
    });
  } catch (error) {
    throw toJevServiceError(error);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isAnswerOfKind(value: unknown, kind: "choice" | "noul" | "score"): value is JevAnswer {
  if (!isRecord(value) || value.type !== kind) return false;
  if (kind === "noul") return typeof value.noul === "number";
  if (kind === "choice") return typeof value.choice === "string" && isRecord(value.probabilities);
  return typeof value.score === "number" && isRecord(value.probabilities);
}

/** 画面が前提にしている回答がそろっているかを確かめる（欠けていれば描画せずエラーにする） */
function checkAnswers(scenario: ScenarioId, answers: unknown): Record<string, JevAnswer> {
  if (!isRecord(answers)) throw new JevServiceError("UPSTREAM_ERROR");
  for (const question of SCENARIOS[scenario].questions) {
    if (!isAnswerOfKind(answers[question.key], question.kind)) {
      throw new JevServiceError("UPSTREAM_ERROR");
    }
  }
  return answers as Record<string, JevAnswer>;
}
