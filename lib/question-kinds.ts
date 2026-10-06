import type { QuestionKind } from "@/lib/scenarios";

// 3つの質問タイプの呼び名と色。結果カードと画面下部の図で同じものを使う。
export const QUESTION_KINDS: Record<
  QuestionKind,
  { name: string; nickname: string; tone: string }
> = {
  choice: { name: "Choice", nickname: "どれ？", tone: "var(--color-iris)" },
  score: { name: "Score", nickname: "どのくらい？", tone: "var(--color-saffron)" },
  noul: { name: "Noul", nickname: "Yes / No？", tone: "var(--color-lagoon)" },
};

export const KIND_ORDER: readonly QuestionKind[] = ["choice", "score", "noul"];
