import "server-only";

import type {
  ChoiceResponse,
  EntryType,
  NoulResponse,
  ScoreCriteria,
  ScoreResponse,
} from "@typesafe-ai/sdk";
import { choiceConfidence, expectedScore, scoreConfidence } from "@/lib/jev/confidence";
import { buildJevRequest } from "@/lib/jev/questions";
import {
  SCENARIOS,
  type ChoiceQuestionMeta,
  type ScenarioId,
  type ScoreQuestionMeta,
} from "@/lib/scenarios";
import type { JevAnswer, MockSource } from "@/lib/types";

// Demo Mode 用のサンプル値。Jev API は呼ばない。
// プリセットの文章には、Jev の回答を想定して事前に用意した値を返す。
// それ以外の文章には、キーワードの有無から作った簡易サンプルを返す（Jev の判断ではない）。
// どちらも公式 API と同じ構造で、confidence と score は公式の計算式で確率から求める。

/** Choice は候補ごとの確率、Noul は YES の確率、Score はレベル 0 から順の確率 */
type CompactAnswer = Record<string, number> | number | readonly number[];
type CompactAnswers = Record<string, CompactAnswer>;

const PRESET_ANSWERS: Record<ScenarioId, Record<string, CompactAnswers>> = {
  inquiry: {
    "payment-error": {
      category: { bug: 0.91, feature_request: 0.01, question: 0.01, billing: 0.05, other: 0.02 },
      urgent: 0.88,
      impact: [0, 0.01, 0.04, 0.25, 0.7],
    },
    "login-blank": {
      category: { bug: 0.93, feature_request: 0.01, question: 0.03, billing: 0, other: 0.03 },
      urgent: 0.71,
      impact: [0, 0.03, 0.17, 0.62, 0.18],
    },
    "dark-mode": {
      category: { bug: 0.01, feature_request: 0.95, question: 0.01, billing: 0, other: 0.03 },
      urgent: 0.03,
      impact: [0.78, 0.19, 0.02, 0.01, 0],
    },
    "password-question": {
      category: { bug: 0.02, feature_request: 0.01, question: 0.94, billing: 0, other: 0.03 },
      urgent: 0.06,
      impact: [0.62, 0.33, 0.04, 0.01, 0],
    },
    "sarcastic-payment": {
      category: { bug: 0.81, feature_request: 0, question: 0.01, billing: 0.14, other: 0.04 },
      urgent: 0.82,
      impact: [0.03, 0.05, 0.12, 0.28, 0.52],
    },
  },
  qa: {
    "generic-error": { actionable: 0.12, clarity: [0.81, 0.16, 0.03, 0] },
    "vague-input": { actionable: 0.34, clarity: [0.15, 0.58, 0.24, 0.03] },
    "specific-card": { actionable: 0.93, clarity: [0, 0.02, 0.21, 0.77] },
    "code-only": { actionable: 0.06, clarity: [0.74, 0.22, 0.04, 0] },
  },
  voc: {
    "search-reset": {
      category: { ux: 0.74, bug: 0.17, feature_request: 0.06, positive: 0, other: 0.03 },
      dissatisfaction: [0.01, 0.22, 0.63, 0.13, 0.01],
      worth_improving: 0.93,
    },
    thanks: {
      category: { ux: 0.01, bug: 0, feature_request: 0, positive: 0.96, other: 0.03 },
      dissatisfaction: [0.95, 0.04, 0.01, 0, 0],
      worth_improving: 0.09,
    },
    "churn-risk": {
      category: { ux: 0.08, bug: 0.86, feature_request: 0, positive: 0, other: 0.06 },
      dissatisfaction: [0, 0.01, 0.05, 0.27, 0.67],
      worth_improving: 0.95,
    },
    "price-alert": {
      category: { ux: 0.05, bug: 0, feature_request: 0.92, positive: 0, other: 0.03 },
      dissatisfaction: [0.41, 0.48, 0.1, 0.01, 0],
      worth_improving: 0.81,
    },
  },
};

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

function toChoice(meta: ChoiceQuestionMeta, probabilities: Record<string, number>): ChoiceResponse {
  const ordered = meta.options.map((option) => probabilities[option.key] ?? 0);
  const top = ordered.indexOf(Math.max(...ordered));
  return {
    type: "choice",
    choice: meta.options[top].key,
    confidence: round4(choiceConfidence(ordered)),
    probabilities: Object.fromEntries(meta.options.map((option, i) => [option.key, ordered[i]])),
  };
}

function toNoul(probabilityOfYes: number): NoulResponse {
  return { type: "noul", noul: probabilityOfYes };
}

function toScore(legend: readonly EntryType[], probabilities: readonly number[]): ScoreResponse {
  return {
    type: "score",
    score: round4(expectedScore(probabilities)),
    confidence: round4(scoreConfidence(probabilities)),
    legend: Object.fromEntries(legend.map((description, i) => [String(i), description])),
    probabilities: Object.fromEntries(probabilities.map((p, i) => [String(i), p])),
  };
}

function expand(scenario: ScenarioId, compact: CompactAnswers): Record<string, JevAnswer> {
  const { questions } = buildJevRequest(scenario, "");
  const answers: Record<string, JevAnswer> = {};
  for (const meta of SCENARIOS[scenario].questions) {
    const value = compact[meta.key];
    if (meta.kind === "choice") {
      answers[meta.key] = toChoice(meta, value as Record<string, number>);
    } else if (meta.kind === "noul") {
      answers[meta.key] = toNoul(value as number);
    } else {
      const criteria = questions[meta.key].criteria as ScoreCriteria;
      answers[meta.key] = toScore(criteria, value as readonly number[]);
    }
  }
  return answers;
}

// ---- プリセット以外の入力用: キーワードによる簡易サンプル ----

function countHits(text: string, keywords: readonly string[]): number {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 合計がちょうど 1 になるよう小数2桁に丸める（誤差は最大の値で吸収する） */
function roundDistribution(weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const rounded = weights.map((w) => Math.round((w / total) * 100) / 100);
  const top = rounded.indexOf(Math.max(...rounded));
  rounded[top] = Math.round((rounded[top] + 1 - rounded.reduce((a, b) => a + b, 0)) * 100) / 100;
  return rounded;
}

/** center（小数可）の段階を山にした分布 */
function peakedAt(levels: number, center: number): number[] {
  const weights = Array.from({ length: levels }, (_, i) => Math.exp(-1.6 * Math.abs(i - center)));
  return roundDistribution(weights);
}

/** キーワードの出現数を候補ごとの重みにする。どれにも当たらなければ other が最大になる */
function choiceFromHits(meta: ChoiceQuestionMeta, hits: Record<string, number>) {
  const weights = meta.options.map((option) =>
    option.key === "other" ? 0.35 : 0.12 + (hits[option.key] ?? 0),
  );
  const distribution = roundDistribution(weights);
  return Object.fromEntries(meta.options.map((option, i) => [option.key, distribution[i]]));
}

function choiceMeta(scenario: ScenarioId, key: string): ChoiceQuestionMeta {
  return SCENARIOS[scenario].questions.find((q) => q.key === key) as ChoiceQuestionMeta;
}

function scoreLevels(scenario: ScenarioId, key: string): number {
  return (SCENARIOS[scenario].questions.find((q) => q.key === key) as ScoreQuestionMeta).levels
    .length;
}

const BUG_WORDS = [
  "エラー",
  "できない",
  "できません",
  "動かない",
  "動きません",
  "真っ白",
  "落ちる",
  "落ちます",
  "失敗",
  "表示されない",
  "表示されません",
  "不具合",
  "バグ",
  "固まる",
  "固まって",
  "止まり",
  "止まる",
];
const FEATURE_WORDS = ["ほしい", "欲しい", "うれしい", "嬉しい", "要望", "あると", "追加", "機能", "対応して"];

function heuristicInquiry(text: string): CompactAnswers {
  const hits = {
    bug: countHits(text, BUG_WORDS),
    feature_request: countHits(text, FEATURE_WORDS),
    question: countHits(text, ["どこ", "どう", "方法", "教えて", "ですか", "でしょうか", "？", "?"]),
    billing: countHits(text, ["請求", "料金", "返金", "領収書", "支払", "プラン", "課金", "引き落とし"]),
  };
  const critical = countHits(text, [
    "決済",
    "購入",
    "ログイン",
    "全部",
    "全て",
    "すべて",
    "昨日から",
    "至急",
    "急ぎ",
    "データ",
    "消え",
    "セキュリティ",
  ]);
  const bug = Math.min(hits.bug, 3);
  const impactCenter =
    bug > 0 ? 1 + Math.min(critical, 3) * 0.9 + (bug >= 2 ? 0.6 : 0) : hits.billing > 0 ? 1 : 0;
  return {
    category: choiceFromHits(choiceMeta("inquiry", "category"), hits),
    urgent: Math.round(clamp(0.05 + 0.18 * bug + 0.14 * Math.min(critical, 3), 0.02, 0.96) * 100) / 100,
    impact: peakedAt(scoreLevels("inquiry", "impact"), clamp(impactCenter, 0, 4)),
  };
}

function heuristicQa(text: string): CompactAnswers {
  const action = Math.min(
    countHits(text, [
      "ください",
      "お試し",
      "確認",
      "もう一度",
      "再度",
      "再読み込み",
      "入力し",
      "押して",
      "お問い合わせ",
      "やり直",
    ]),
    3,
  );
  const reason = Math.min(
    countHits(text, ["ため", "ので", "正しくありません", "できませんでした", "不足", "期限", "通信", "接続"]),
    2,
  );
  const level = action >= 2 ? (reason >= 1 ? 3 : 2) : action === 1 || reason >= 1 ? 1 : 0;
  return {
    actionable: Math.round(clamp(0.08 + 0.2 * action + 0.08 * reason, 0.02, 0.97) * 100) / 100,
    clarity: peakedAt(scoreLevels("qa", "clarity"), level),
  };
}

function heuristicVoc(text: string): CompactAnswers {
  const hits = {
    ux: countHits(text, ["面倒", "分かりにく", "わかりにく", "使いにく", "探しにく", "見づら", "手間", "消え", "不便"]),
    bug: countHits(text, BUG_WORDS),
    feature_request: countHits(text, [...FEATURE_WORDS, "通知して"]),
    positive: countHits(text, ["ありがとう", "助かって", "助かり", "便利", "楽に", "好き", "最高", "使いやすい", "満足"]),
  };
  const churn = countHits(text, ["乗り換え", "解約", "やめ", "退会", "使わない"]);
  const strong = countHits(text, ["最悪", "ひどい", "イライラ", "怒", "二度と"]);
  const problems = hits.ux + hits.bug + hits.feature_request;
  const center =
    churn > 0
      ? 3.6
      : strong > 0
        ? 3
        : hits.ux > 0 || hits.bug > 0
          ? 2
          : hits.positive > 0 && problems === 0
            ? 0.2
            : 1;
  return {
    category: choiceFromHits(choiceMeta("voc", "category"), hits),
    dissatisfaction: peakedAt(scoreLevels("voc", "dissatisfaction"), center),
    worth_improving:
      problems > 0 ? Math.round(clamp(0.45 + 0.17 * Math.min(problems, 3), 0, 0.96) * 100) / 100 : 0.12,
  };
}

const HEURISTICS: Record<ScenarioId, (text: string) => CompactAnswers> = {
  inquiry: heuristicInquiry,
  qa: heuristicQa,
  voc: heuristicVoc,
};

export interface MockAnswers {
  answers: Record<string, JevAnswer>;
  source: MockSource;
}

export function getMockAnswers(scenario: ScenarioId, text: string): MockAnswers {
  const normalized = text.trim();
  const preset = SCENARIOS[scenario].presets.find((p) => p.text.trim() === normalized);
  const predefined = preset ? PRESET_ANSWERS[scenario][preset.id] : undefined;
  if (predefined) {
    return { answers: expand(scenario, predefined), source: "preset" };
  }
  return { answers: expand(scenario, HEURISTICS[scenario](normalized)), source: "heuristic" };
}
