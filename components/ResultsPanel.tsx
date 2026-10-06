import type { ChoiceResponse, NoulResponse, ScoreResponse } from "@typesafe-ai/sdk";
import { ChoiceCard } from "@/components/answers/ChoiceCard";
import { NoulCard } from "@/components/answers/NoulCard";
import { ScoreCard } from "@/components/answers/ScoreCard";
import type { RunState } from "@/components/DecisionLab";
import { QaComparison } from "@/components/QaComparison";
import { formatSeconds } from "@/lib/format";
import type { QuestionMeta, ScenarioMeta } from "@/lib/scenarios";
import type { DecisionResult, JevAnswer, JevMode } from "@/lib/types";

interface ResultsPanelProps {
  scenario: ScenarioMeta;
  run: RunState;
  mode: JevMode;
  /** サーバーが LIVE 設定で、まだ DEMO に切り替えていない */
  canContinueInDemo: boolean;
  onContinueInDemo: () => void;
  onRetry: () => void;
}

export function ResultsPanel({
  scenario,
  run,
  mode,
  canContinueInDemo,
  onContinueInDemo,
  onRetry,
}: ResultsPanelProps) {
  const result = run.status === "done" ? run.result : undefined;

  return (
    <section aria-labelledby="answers-heading" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="answers-heading" className="eyebrow">
          Answers · Jevの判断
        </h2>
        <RunStatus run={run} mode={mode} />
      </div>

      {run.status === "error" && (
        <div role="alert" className="rounded-3xl border border-coral/70 bg-coral/10 p-5">
          <p className="text-xl font-bold">{run.error.message}</p>
          {run.error.canUseDemo && run.mode === "live" && (
            <p className="mt-1 text-lg text-fog">Demo Modeへ切り替えて続行できます。</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {run.error.canUseDemo && canContinueInDemo && (
              <button
                type="button"
                onClick={onContinueInDemo}
                className="cursor-pointer rounded-xl bg-paper px-5 py-2.5 text-lg font-bold text-ink-950 hover:opacity-90"
              >
                Demo Modeで続行
              </button>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-xl border border-rule px-5 py-2.5 text-lg text-paper hover:border-fog"
            >
              もう一度試す
            </button>
          </div>
        </div>
      )}

      <div
        key={`${scenario.id}-${run.status === "done" ? run.runId : "pending"}`}
        data-demo={result?.mode === "mock"}
        aria-busy={run.status === "deciding"}
        className={`grid gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${
          run.status === "deciding" ? "opacity-45" : ""
        }`}
      >
        {scenario.questions.map((question) => (
          <AnswerCard key={question.key} question={question} answer={result?.answers[question.key]} />
        ))}
        {scenario.id === "qa" && <QaComparison answers={result?.answers} />}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-mist">Jevが返した判断の確信度・分布です。正解保証ではありません。</p>
        {scenario.footnote && <p className="text-base text-fog">{scenario.footnote}</p>}
      </div>

      {result && <JsonViewer result={result} />}
    </section>
  );
}

function RunStatus({ run, mode }: { run: RunState; mode: JevMode }) {
  if (run.status === "deciding") {
    return (
      <p role="status" className="inline-flex items-center gap-2 rounded-full border border-iris/60 px-4 py-1.5 text-lg">
        <span className="pulse-dot size-2.5 rounded-full bg-iris" aria-hidden />
        Jev is deciding…
      </p>
    );
  }

  if (run.status === "done") {
    const { result } = run;
    if (result.mode === "mock") {
      return (
        <p role="status" className="hatch rounded-full border border-fog/50 px-4 py-1.5 text-base">
          <span className="font-mono font-bold">DEMO</span>
          {" · "}
          {result.mockSource === "preset"
            ? "事前定義のサンプル値です（Jev API は呼び出していません）"
            : "キーワードから作った簡易サンプルです（Jevの判断ではありません）"}
        </p>
      );
    }
    return (
      <p role="status" className="font-mono text-sm text-fog">
        <span className="font-bold text-coral">LIVE</span> · {result.model}
        {result.latencyMs !== null && ` · ${formatSeconds(result.latencyMs)}`}
        {result.usage && ` · 入力 ${result.usage.input_tokens.toLocaleString()} tokens`}
      </p>
    );
  }

  if (run.status === "idle") {
    return (
      <p className="text-base text-fog">
        答えを予想してから「Jevに判断してもらう」を押してみましょう
        {mode === "mock" && "（DEMO）"}
      </p>
    );
  }

  return null;
}

function AnswerCard({ question, answer }: { question: QuestionMeta; answer: JevAnswer | undefined }) {
  switch (question.kind) {
    case "choice":
      return <ChoiceCard meta={question} answer={answer as ChoiceResponse | undefined} />;
    case "noul":
      return <NoulCard meta={question} answer={answer as NoulResponse | undefined} />;
    case "score":
      return <ScoreCard meta={question} answer={answer as ScoreResponse | undefined} />;
  }
}

function JsonViewer({ result }: { result: DecisionResult }) {
  const response = { model: result.model, answers: result.answers, usage: result.usage };
  return (
    <details className="rounded-2xl border border-rule bg-ink-900">
      <summary className="cursor-pointer px-5 py-3 text-base text-fog hover:text-paper">
        JSON を見る（Jevに送った State と質問 / 返ってきた型付きの回答）
      </summary>
      <div className="grid gap-4 border-t border-rule p-5 xl:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow">Request → Jev</p>
          <pre className="mt-2 max-h-[28rem] overflow-auto rounded-xl bg-ink-950 p-4 font-mono text-xs leading-relaxed text-fog">
            {JSON.stringify(result.request, null, 2)}
          </pre>
        </div>
        <div className="min-w-0">
          <p className="eyebrow">
            {result.mode === "mock" ? "サンプル値（Jev の応答ではありません）" : "Response ← Jev"}
          </p>
          <pre className="mt-2 max-h-[28rem] overflow-auto rounded-xl bg-ink-950 p-4 font-mono text-xs leading-relaxed text-fog">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}
