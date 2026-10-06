import { describe, expect, it } from "vitest";
import { choiceConfidence, expectedScore, scoreConfidence } from "@/lib/jev/confidence";

// 期待値は公式ドキュメント https://docs.typesafe.ai/confidence と
// https://docs.typesafe.ai/primitives/score に載っている数値例から取っている。
describe("choiceConfidence", () => {
  it("トップの確率だけで決まる（(0.6, 0.3, 0.1) と (0.6, 0.2, 0.2) はどちらも 0.4）", () => {
    expect(choiceConfidence([0.6, 0.3, 0.1])).toBeCloseTo(0.4, 10);
    expect(choiceConfidence([0.6, 0.2, 0.2])).toBeCloseTo(0.4, 10);
  });

  it("均等に割れていれば 0、1つに集中していれば 1", () => {
    expect(choiceConfidence([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0, 10);
    expect(choiceConfidence([0, 1, 0, 0, 0])).toBeCloseTo(1, 10);
  });
});

describe("scoreConfidence", () => {
  it("隣り合う段階で割れた (0, 0.5, 0.5) は 0.25、両端で割れた (0.5, 0, 0.5) は 0", () => {
    expect(scoreConfidence([0, 0.5, 0.5])).toBeCloseTo(0.25, 10);
    expect(scoreConfidence([0.5, 0, 0.5])).toBeCloseTo(0, 10);
  });

  it("公式の例 (0, 0.57, 0.43) は約 0.355", () => {
    expect(scoreConfidence([0, 0.57, 0.43])).toBeCloseTo(0.355, 10);
  });

  it("1つの段階に集中していれば 1", () => {
    expect(scoreConfidence([0, 0, 1, 0, 0])).toBeCloseTo(1, 10);
  });
});

describe("expectedScore", () => {
  it("各段階の番号 × 確率の合計（公式の例 (0, 0.57, 0.43) は 1.43）", () => {
    expect(expectedScore([0, 0.57, 0.43])).toBeCloseTo(1.43, 10);
  });
});
