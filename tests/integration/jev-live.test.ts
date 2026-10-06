import { describe, expect, it } from "vitest";
import { decide } from "@/lib/jev/service";
import { SCENARIO_IDS, SCENARIOS } from "@/lib/scenarios";

// 実際の Jev API を呼ぶ。通常の `npm test` には含めない（`npm run test:integration` で実行）。
// 勉強会の前に、APIキー・ネットワーク・質問定義がそろって動くかの確認に使う。
const hasApiKey = Boolean(process.env.TYPESAFE_API_KEY?.trim());

describe.skipIf(!hasApiKey)("Jev API（live）", () => {
  it.each(SCENARIO_IDS)("%s タブの初期値を、1回の呼び出しで全質問について判断できる", async (scenario) => {
    const meta = SCENARIOS[scenario];

    const result = await decide({ scenario, text: meta.defaultText, mode: "live" });

    expect(result.mode).toBe("live");
    expect(result.model).toMatch(/^jev-/);
    for (const question of meta.questions) {
      expect(result.answers[question.key].type).toBe(question.kind);
    }
  });
});

describe.runIf(!hasApiKey)("Jev API（live）", () => {
  it.skip("TYPESAFE_API_KEY が未設定のためスキップしました（.env.local に設定すると実行されます）", () => {});
});
