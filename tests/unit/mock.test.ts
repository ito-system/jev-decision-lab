import { describe, expect, it } from "vitest";
import type { ChoiceResponse, NoulResponse, ScoreResponse } from "@typesafe-ai/sdk";
import { choiceConfidence, scoreConfidence } from "@/lib/jev/confidence";
import { getMockAnswers } from "@/lib/jev/mock";
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from "@/lib/scenarios";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** 公式 API リファレンスの回答構造・規則を満たしているか */
function expectOfficialShape(scenario: ScenarioId, text: string) {
  const { answers } = getMockAnswers(scenario, text);
  const meta = SCENARIOS[scenario];

  expect(Object.keys(answers)).toEqual(meta.questions.map((q) => q.key));

  for (const question of meta.questions) {
    const answer = answers[question.key];
    expect(answer.type).toBe(question.kind);

    if (question.kind === "choice") {
      const choice = answer as ChoiceResponse;
      const optionKeys = question.options.map((o) => o.key);
      const probabilities = optionKeys.map((key) => choice.probabilities[key]);
      expect(Object.keys(choice.probabilities).sort()).toEqual([...optionKeys].sort());
      expect(sum(probabilities)).toBeCloseTo(1, 9);
      expect(choice.probabilities[choice.choice]).toBe(Math.max(...probabilities));
      // 実際の API と同じく、表示用に丸めた値でよい
      expect(choice.confidence).toBeCloseTo(choiceConfidence(probabilities), 3);
    }

    if (question.kind === "noul") {
      const noul = (answer as NoulResponse).noul;
      expect(noul).toBeGreaterThanOrEqual(0);
      expect(noul).toBeLessThanOrEqual(1);
    }

    if (question.kind === "score") {
      const score = answer as ScoreResponse;
      const levels = question.levels.map((_, i) => String(i));
      const probabilities = levels.map((level) => score.probabilities[Number(level)]);
      expect(Object.keys(score.probabilities)).toEqual(levels);
      expect(Object.keys(score.legend)).toEqual(levels);
      expect(sum(probabilities)).toBeCloseTo(1, 9);
      expect(score.score).toBeCloseTo(sum(probabilities.map((p, i) => p * i)), 3);
      expect(score.confidence).toBeCloseTo(scoreConfidence(probabilities), 3);
    }
  }
}

const presetCases = SCENARIO_IDS.flatMap((scenario) =>
  SCENARIOS[scenario].presets.map((preset) => [scenario, preset.id, preset.text] as const),
);

describe("getMockAnswers（プリセット）", () => {
  it.each(presetCases)("%s / %s には事前定義のサンプル値がある", (scenario, _id, text) => {
    expect(getMockAnswers(scenario, text).source).toBe("preset");
  });

  it.each(presetCases)("%s / %s のサンプル値は公式レスポンスと同じ構造", (scenario, _id, text) => {
    expectOfficialShape(scenario, text);
  });

  it("前後の空白や改行があってもプリセットとして扱う", () => {
    const text = `\n  ${SCENARIOS.inquiry.defaultText}  \n`;

    expect(getMockAnswers("inquiry", text).source).toBe("preset");
  });

  it("別のタブのプリセット文は、そのタブではプリセット扱いしない", () => {
    expect(getMockAnswers("voc", SCENARIOS.inquiry.defaultText).source).toBe("heuristic");
  });

  it("Score の legend には Jev に送る段階の説明が入る", () => {
    const { answers } = getMockAnswers("inquiry", SCENARIOS.inquiry.defaultText);
    const impact = answers.impact as ScoreResponse;

    expect(String(impact.legend[0])).toContain("影響はほぼない");
    expect(String(impact.legend[4])).toContain("多数ユーザーまたは重要機能に重大な影響");
  });
});

// デモの流れ（README の発表者向けシナリオ）が前提にしている結果
describe("getMockAnswers（デモで見せる結果）", () => {
  const preset = (scenario: ScenarioId, id: string) => {
    const found = SCENARIOS[scenario].presets.find((p) => p.id === id);
    if (!found) throw new Error(`preset ${id} not found`);
    return getMockAnswers(scenario, found.text).answers;
  };

  it("決済エラーは Bug・緊急対応 YES・影響度が高い", () => {
    const answers = preset("inquiry", "payment-error");

    expect((answers.category as ChoiceResponse).choice).toBe("bug");
    expect((answers.urgent as NoulResponse).noul).toBeGreaterThan(0.5);
    expect((answers.impact as ScoreResponse).score).toBeGreaterThanOrEqual(3);
  });

  it("皮肉まじりの決済失敗も、口調ではなく事象から Bug・緊急対応 YES になる", () => {
    const answers = preset("inquiry", "sarcastic-payment");

    expect((answers.category as ChoiceResponse).choice).toBe("bug");
    expect((answers.urgent as NoulResponse).noul).toBeGreaterThan(0.5);
  });

  it.each([
    ["dark-mode", "feature_request"],
    ["password-question", "question"],
  ])("%s は %s に分類され、緊急対応は NO 寄り", (id, expected) => {
    const answers = preset("inquiry", id);

    expect((answers.category as ChoiceResponse).choice).toBe(expected);
    expect((answers.urgent as NoulResponse).noul).toBeLessThan(0.5);
  });

  it("「エラーが発生しました。」だけでは次の行動が分からない（YES が 50% 未満）", () => {
    const answers = preset("qa", "generic-error");

    expect((answers.actionable as NoulResponse).noul).toBeLessThan(0.5);
  });

  it("具体的なエラーメッセージは次の行動が分かる（YES が 50% 超）", () => {
    const answers = preset("qa", "specific-card");

    expect((answers.actionable as NoulResponse).noul).toBeGreaterThan(0.5);
  });

  it("検索条件が消える声は UX に分類され、改善検討の価値がある", () => {
    const answers = preset("voc", "search-reset");

    expect((answers.category as ChoiceResponse).choice).toBe("ux");
    expect((answers.worth_improving as NoulResponse).noul).toBeGreaterThan(0.5);
  });

  it("乗り換えに触れた声は、感謝の声より不満度が高い", () => {
    const churn = preset("voc", "churn-risk").dissatisfaction as ScoreResponse;
    const thanks = preset("voc", "thanks").dissatisfaction as ScoreResponse;

    expect(churn.score).toBeGreaterThan(thanks.score);
  });
});

describe("getMockAnswers（プリセット以外の入力）", () => {
  it.each([
    ["inquiry", "アプリを開くとエラーが出て動きません"],
    ["inquiry", "請求書を再発行してもらえますか"],
    ["qa", "保存できませんでした。通信状況を確認して、もう一度お試しください。"],
    ["voc", "とても便利で助かっています！ありがとう"],
    ["voc", "abc"],
  ] as const)("%s「%s」はキーワードによる簡易サンプルを返す", (scenario, text) => {
    expect(getMockAnswers(scenario, text).source).toBe("heuristic");
    expectOfficialShape(scenario, text);
  });

  it.each([
    ["inquiry", "category", "アプリを開くとエラーが出て動きません", "bug"],
    ["inquiry", "category", "請求書を再発行してもらえますか", "billing"],
    ["inquiry", "category", "CSVで書き出せる機能がほしいです", "feature_request"],
    ["voc", "category", "とても便利で助かっています！ありがとう", "positive"],
    ["voc", "category", "ボタンの場所が分かりにくくて使いにくいです", "ux"],
  ] as const)("%s「%s」の %s はキーワードから %s になる", (scenario, key, text, expected) => {
    const answer = getMockAnswers(scenario, text).answers[key] as ChoiceResponse;

    expect(answer.choice).toBe(expected);
  });

  it("次の行動が書かれたメッセージは、書かれていないメッセージより YES が高い", () => {
    const withAction = getMockAnswers(
      "qa",
      "保存できませんでした。通信状況を確認して、もう一度お試しください。",
    ).answers.actionable as NoulResponse;
    const withoutAction = getMockAnswers("qa", "不明なエラーです").answers
      .actionable as NoulResponse;

    expect(withAction.noul).toBeGreaterThan(withoutAction.noul);
  });

  it("同じ入力には毎回同じ値を返す", () => {
    const text = "画面が固まって操作できません";

    expect(getMockAnswers("inquiry", text)).toEqual(getMockAnswers("inquiry", text));
  });
});
