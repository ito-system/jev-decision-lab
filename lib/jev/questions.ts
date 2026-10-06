import "server-only";

import { choice, noul, score, type Questions } from "@typesafe-ai/sdk";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";

// Jev に送る質問の定義。公式ドキュメントの指針に沿って書いている。
// - Choice: 候補同士の境界が分かるよう what / not_for / examples を付ける
//   https://docs.typesafe.ai/primitives/advanced#json-rubric-for-boundary-clarification
// - Score: 「程度」ではなく「状況」を書く。criteria はレベル 0 から順に並べた配列（SDK v0.6.0〜）
//   https://docs.typesafe.ai/primitives/score#writing-good-levels
// - Noul: yes / no の境界を criteria の true / false で明確にする
//   https://docs.typesafe.ai/primitives/noul#writing-a-noul-question
// 質問文（question）は画面に表示する文と同じものを lib/scenarios.ts から使う。

function questionText(scenario: ScenarioId, key: string): string {
  const meta = SCENARIOS[scenario].questions.find((q) => q.key === key);
  if (!meta) throw new Error(`Unknown question "${key}" in scenario "${scenario}"`);
  return meta.question;
}

const JUDGE_BY_FACTS = "書き手の口調（丁寧さ・冗談・遠慮）ではなく、書かれている事象の内容で判断する。";

const inquiryQuestions = {
  category: choice(
    {
      question: questionText("inquiry", "category"),
      focus: "問い合わせの中心となる用件で分類する。触れられているすべての話題ではなく、主な目的で判断する。",
    },
    {
      bug: {
        what: "製品やサービスが期待どおりに動かないという不具合の報告。エラーが表示される、画面が真っ白になる、ボタンが反応しない、処理が失敗するなど。",
        not_for: "新しい機能の要望、使い方の質問、料金や請求内容そのものについての相談。",
        note: "決済・購入など、お金に関わる画面で起きていても、システムが正しく動かないことが主題なら bug。",
        examples: ["保存ボタンを押すとエラーが表示される", "アプリを開くとすぐに落ちる"],
      },
      feature_request: {
        what: "まだ存在しない機能や、既存機能の改善・追加についての要望や提案。",
        not_for: "既存機能が壊れているという報告、使い方の質問。",
        examples: ["CSVで書き出せるようにしてほしい", "通知の時間を選べるとうれしい"],
      },
      question: {
        what: "使い方・設定方法・仕様などについての質問。",
        not_for: "不具合の報告、機能の要望。",
        examples: ["通知をオフにする方法を教えてください", "対応しているブラウザはどれですか？"],
      },
      billing: {
        what: "料金・請求・支払い方法・返金・領収書・契約プランなど、お金や契約の手続きについての相談。",
        not_for: "決済画面のエラーなど、システムの不具合が主題のもの（それは bug）。",
        examples: ["二重に請求されている", "領収書を発行してほしい"],
      },
      other: {
        what: "上記のどれにも当てはまらない内容。お礼、雑談、営業の連絡、意味の取れない文章など。",
      },
    },
  ),
  urgent: noul(
    { question: questionText("inquiry", "urgent"), focus: JUDGE_BY_FACTS },
    {
      true: "購入・決済・ログインなど主要な機能が使えない、多くのユーザーに影響している可能性がある、データ消失やセキュリティの懸念がある、など担当者がすぐに確認すべき内容。",
      false: "機能の要望、使い方の質問、軽微な不便など、通常の順番で対応しても問題ない内容。",
    },
  ),
  impact: score({ question: questionText("inquiry", "impact"), focus: JUDGE_BY_FACTS }, [
    "影響はほぼない（感想・要望・一般的な質問で、困っている事象は書かれていない）",
    "軽微な不便がある（回避策がある、見た目や細かな部分の問題）",
    "主要機能の一部が利用できない（特定の条件や一部の操作でのみ失敗する）",
    "主要機能が利用できない（ログインや購入など、中心となる操作ができない）",
    "多数ユーザーまたは重要機能に重大な影響（決済の全面的な停止、データ消失、セキュリティ問題など）",
  ]),
} satisfies Questions;

const qaQuestions = {
  actionable: noul(questionText("qa", "actionable"), {
    true: "何が起きたのか、そしてユーザーが次に何をすればよいか（入力の修正、再試行、問い合わせ先など）が、メッセージの文面から具体的に分かる。",
    false: "原因や次の行動が書かれておらず、ユーザーが推測するしかない。",
  }),
  clarity: score(questionText("qa", "clarity"), [
    "次に何をすべきか全く分からない（何が起きたかも、どうすればよいかも書かれていない）",
    "推測すれば分かる（原因のヒントはあるが、取るべき行動は書かれていない）",
    "ある程度明確（取るべき行動は書かれているが、具体性や手順が足りない）",
    "次の行動が明確（何が起きたか、何をすればよいかが具体的に書かれている）",
  ]),
} satisfies Questions;

const vocQuestions = {
  category: choice(
    {
      question: questionText("voc", "category"),
      focus: "フィードバック全体の中心となる内容で分類する。",
    },
    {
      ux: {
        what: "機能は仕様どおりに動いているが、使い勝手・操作の流れ・分かりやすさに不満や指摘がある。",
        not_for: "エラーや故障など明らかな不具合（それは bug）、新しい機能の追加要望（それは feature_request）。",
        examples: ["ボタンの位置が分かりにくい", "毎回同じ情報を入力し直すのが面倒"],
      },
      bug: {
        what: "エラー、クラッシュ、処理の失敗など、仕様どおりに動いていない不具合の報告。",
        not_for: "仕様どおりに動いているが使いにくいという指摘（それは ux）。",
        examples: ["保存するとエラーになる", "アプリが突然落ちる"],
      },
      feature_request: {
        what: "現在ない機能やサービスを新しく追加してほしいという要望。",
        not_for: "既存の操作の流れの使いにくさ（それは ux）。",
        examples: ["CSVで書き出せるようにしてほしい", "PayPayで支払えるようにしてほしい"],
      },
      positive: {
        what: "満足・称賛・感謝など、好意的な声。",
        not_for: "不満や要望が主な内容のもの。",
        examples: ["とても使いやすいです", "いつも助かっています"],
      },
      other: {
        what: "上記のどれにも当てはまらない内容。",
      },
    },
  ),
  dissatisfaction: score(questionText("voc", "dissatisfaction"), [
    "不満なし（満足している、または中立的な感想）",
    "少し気になる（小さな引っかかりはあるが、利用には支障がない）",
    "不便を感じている（手間や面倒さを感じていて、改善を望んでいる）",
    "強い不満（怒りや強い言葉で不満を表している）",
    "利用継続に影響するほど重大（解約・乗り換え・利用をやめることに触れている）",
  ]),
  worth_improving: noul(questionText("voc", "worth_improving"), {
    true: "具体的な課題や改善の手がかりが含まれていて、プロダクト改善の検討材料になる。",
    false: "具体的な課題が含まれておらず、改善の検討材料にならない（純粋な称賛のみ、意味の取れない内容など）。",
  }),
} satisfies Questions;

const QUESTIONS: Record<ScenarioId, Questions> = {
  inquiry: inquiryQuestions,
  qa: qaQuestions,
  voc: vocQuestions,
};

export interface JevRequest {
  state: Record<string, string>;
  questions: Questions;
}

/** 1つの state と、そのシナリオのすべての質問をまとめたリクエストを作る */
export function buildJevRequest(scenario: ScenarioId, text: string): JevRequest {
  return {
    state: { [SCENARIOS[scenario].stateKey]: text },
    questions: QUESTIONS[scenario],
  };
}
