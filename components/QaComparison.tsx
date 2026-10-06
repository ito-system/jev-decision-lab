import type { NoulResponse, ScoreResponse } from "@typesafe-ai/sdk";
import { formatPercent, formatScore } from "@/lib/format";
import type { JevAnswer } from "@/lib/types";

// QA タブだけの比較カード: 従来の DOM assertion が確かめられるのは「表示されているか」まで
export function QaComparison({ answers }: { answers: Record<string, JevAnswer> | undefined }) {
  const actionable = answers?.actionable as NoulResponse | undefined;
  const clarity = answers?.clarity as ScoreResponse | undefined;

  return (
    <article
      aria-label="従来のテストとの比較"
      className="flex flex-col rounded-3xl border border-dashed border-rule-strong p-5"
    >
      <p className="eyebrow">比較 · 従来のテスト</p>
      <h3 className="mt-2.5 text-[1.45rem] leading-snug font-bold">何を確かめられるか</h3>

      <dl className="mt-4 flex flex-1 flex-col gap-4">
        <div className="rounded-2xl bg-ink-900 p-4">
          <dt className="text-base text-fog">表示されているか</dt>
          <dd className="mt-1 font-mono text-sm text-mist">expect(getByText(…)).toBeVisible()</dd>
          <dd className="mt-2 text-xl font-bold">✓ PASS（例）</dd>
        </div>
        <div className="rounded-2xl bg-ink-900 p-4">
          <dt className="text-base text-fog">意味として伝わるか</dt>
          <dd className="mt-1 text-sm text-mist">DOM assertion では確かめにくい → Jev（Noul・Score）</dd>
          <dd className="readout mt-2 text-xl">
            {actionable && clarity
              ? `YES ${formatPercent(actionable.noul)} · ${formatScore(clarity.score)} / 3`
              : "?"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
