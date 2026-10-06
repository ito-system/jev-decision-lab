// 3つのタブ（シナリオ）の表示用メタデータ。
// UI とサーバーの両方から読むため、SDK やサーバー専用モジュールは import しない。
// Jev に送る質問の詳細（criteria の説明文など）は lib/jev/questions.ts にある。

export type ScenarioId = "inquiry" | "qa" | "voc";
export type QuestionKind = "choice" | "noul" | "score";

interface QuestionMetaBase {
  /** 質問 ID。Jev のレスポンスでは同じキーで回答が返る。 */
  key: string;
  kind: QuestionKind;
  /** 結果カードの見出し（短い名前） */
  label: string;
  /** Jev に送る質問文。画面にもこのまま表示する。 */
  question: string;
}

export interface ChoiceOptionMeta {
  key: string;
  label: string;
  sublabel: string;
}

export interface ChoiceQuestionMeta extends QuestionMetaBase {
  kind: "choice";
  options: readonly ChoiceOptionMeta[];
}

export interface NoulQuestionMeta extends QuestionMetaBase {
  kind: "noul";
}

export interface ScoreQuestionMeta extends QuestionMetaBase {
  kind: "score";
  /** レベル 0 から順に並べた段階の短い説明 */
  levels: readonly string[];
}

export type QuestionMeta = ChoiceQuestionMeta | NoulQuestionMeta | ScoreQuestionMeta;

export interface Preset {
  /** モック応答と対応付けるための ID */
  id: string;
  label: string;
  text: string;
}

export interface ScenarioMeta {
  id: ScenarioId;
  tabLabel: string;
  heading: string;
  lead: string;
  inputLabel: string;
  /** Jev に送る state オブジェクトのキー（例: { inquiry: "..." }） */
  stateKey: string;
  defaultText: string;
  presets: readonly Preset[];
  questions: readonly QuestionMeta[];
  /** 結果の下に表示する補足 */
  footnote?: string;
}

const INQUIRY_DEFAULT =
  "決済ボタンを押すと500エラーが出て購入できません。昨日から発生しています。";
const QA_DEFAULT = "エラーが発生しました。";
const VOC_DEFAULT =
  "検索して商品を見たあと戻ると、検索条件が全部消えて最初からやり直しになるのが地味に面倒です。";

export const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  inquiry: {
    id: "inquiry",
    tabLabel: "問い合わせ",
    heading: "問い合わせトリアージ",
    lead: "1つの問い合わせに、3種類の質問をまとめて投げます。",
    inputLabel: "問い合わせ内容",
    stateKey: "inquiry",
    defaultText: INQUIRY_DEFAULT,
    presets: [
      { id: "payment-error", label: "決済エラー", text: INQUIRY_DEFAULT },
      { id: "login-blank", label: "ログイン", text: "ログインボタンを押しても画面が真っ白になります。" },
      { id: "dark-mode", label: "要望", text: "ダークモードがあるとうれしいです！" },
      { id: "password-question", label: "質問", text: "パスワードはどこから変更できますか？" },
      {
        id: "sarcastic-payment",
        label: "皮肉まじり",
        text: "別に困っていないんですけど、昨日から決済が全部失敗しています（笑）",
      },
    ],
    questions: [
      {
        key: "category",
        kind: "choice",
        label: "カテゴリ",
        question: "この問い合わせの主な種類は？",
        options: [
          { key: "bug", label: "Bug", sublabel: "不具合" },
          { key: "feature_request", label: "Feature request", sublabel: "要望" },
          { key: "question", label: "Question", sublabel: "質問" },
          { key: "billing", label: "Billing", sublabel: "請求・支払い" },
          { key: "other", label: "Other", sublabel: "その他" },
        ],
      },
      {
        key: "urgent",
        kind: "noul",
        label: "緊急対応",
        question: "この問い合わせは緊急対応を検討すべき内容か？",
      },
      {
        key: "impact",
        kind: "score",
        label: "影響度",
        question: "ユーザーへの影響の大きさは？",
        levels: [
          "影響はほぼない",
          "軽微な不便がある",
          "主要機能の一部が利用できない",
          "主要機能が利用できない",
          "多数ユーザーまたは重要機能に重大な影響",
        ],
      },
    ],
  },
  qa: {
    id: "qa",
    tabLabel: "QA",
    heading: "QA Semantic Check",
    lead: "「表示されているか」ではなく、「意味として正しいか」を判断します。",
    inputLabel: "現在の画面・UIの状態",
    stateKey: "screen_message",
    defaultText: QA_DEFAULT,
    presets: [
      { id: "generic-error", label: "汎用エラー", text: QA_DEFAULT },
      { id: "vague-input", label: "曖昧", text: "入力内容に誤りがあります。" },
      {
        id: "specific-card",
        label: "具体的",
        text: "カード番号が正しくありません。16桁の番号を確認して、もう一度入力してください。",
      },
      { id: "code-only", label: "コードのみ", text: "ERR_PAYMENT_DECLINED (code: 4012)" },
    ],
    questions: [
      {
        key: "actionable",
        kind: "noul",
        label: "次の行動が分かるか",
        question: "このメッセージだけを読んで、ユーザーは次に取るべき行動を理解できるか？",
      },
      {
        key: "clarity",
        kind: "score",
        label: "行動可能性・分かりやすさ",
        question: "このエラーメッセージの行動可能性・分かりやすさ",
        levels: [
          "次に何をすべきか全く分からない",
          "推測すれば分かる",
          "ある程度明確",
          "次の行動が明確",
        ],
      },
    ],
    footnote: 'これは従来のDOM assertionでは確認しにくい、"意味"に関する評価例です。',
  },
  voc: {
    id: "voc",
    tabLabel: "UX / VoC",
    heading: "UX / VoC分析",
    lead: "ユーザーの声を、分類・不満度・改善価値の3つの判断に変換します。",
    inputLabel: "ユーザーの声",
    stateKey: "feedback",
    defaultText: VOC_DEFAULT,
    presets: [
      { id: "search-reset", label: "検索条件が消える", text: VOC_DEFAULT },
      {
        id: "thanks",
        label: "感謝",
        text: "このアプリのおかげで買い物がすごく楽になりました！いつもありがとうございます。",
      },
      {
        id: "churn-risk",
        label: "乗り換え検討",
        text: "また決済の途中で止まりました。もう3回目なので、正直ほかのサービスに乗り換えようか考えています。",
      },
      { id: "price-alert", label: "新機能の要望", text: "お気に入りの商品が値下がりしたら通知してほしいです。" },
    ],
    questions: [
      {
        key: "category",
        kind: "choice",
        label: "フィードバック分類",
        question: "このフィードバックの主な分類は？",
        options: [
          { key: "ux", label: "UX", sublabel: "使い勝手" },
          { key: "bug", label: "Bug", sublabel: "不具合" },
          { key: "feature_request", label: "Feature request", sublabel: "要望" },
          { key: "positive", label: "Positive", sublabel: "好意的" },
          { key: "other", label: "Other", sublabel: "その他" },
        ],
      },
      {
        key: "dissatisfaction",
        kind: "score",
        label: "不満度",
        question: "このユーザーの不満度は？",
        levels: [
          "不満なし",
          "少し気になる",
          "不便を感じている",
          "強い不満",
          "利用継続に影響するほど重大",
        ],
      },
      {
        key: "worth_improving",
        kind: "noul",
        label: "改善検討の価値",
        question: "改善検討対象として扱う価値があるか？",
      },
    ],
  },
};

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[];
