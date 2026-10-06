import { KIND_ORDER, QUESTION_KINDS } from "@/lib/question-kinds";
import type { ScenarioMeta } from "@/lib/scenarios";
import type { JevMode } from "@/lib/types";

interface FlowDiagramProps {
  scenario: ScenarioMeta;
  mode: JevMode;
  deciding: boolean;
}

// 画面下部に常に表示する仕組みの図: State → Jev → Choice / Score / Noul
export function FlowDiagram({ scenario, mode, deciding }: FlowDiagramProps) {
  const used = new Set(scenario.questions.map((question) => question.kind));
  const arrow = `text-2xl ${deciding ? "pulse-dot text-iris" : "text-mist"}`;

  return (
    <footer className="mt-8 border-t border-rule bg-ink-950/90 backdrop-blur md:fixed md:inset-x-0 md:bottom-0 md:z-10 md:mt-0">
      <div
        aria-label="Jevの仕組み"
        className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 lg:px-10"
      >
        <div className="rounded-xl border border-rule bg-ink-900 px-3 py-1.5">
          <span className="font-bold">State</span>
          <span className="ml-2 text-sm text-fog">{scenario.inputLabel}</span>
        </div>
        <span className={arrow} aria-hidden>
          →
        </span>
        <div
          className={`rounded-xl border px-3 py-1.5 ${
            mode === "mock" ? "hatch border-fog/50 bg-ink-800" : "border-paper/60 bg-ink-850"
          }`}
        >
          <span className="font-bold">Jev</span>
          <span className="ml-2 font-mono text-xs text-fog">
            {mode === "mock" ? "DEMO（サンプル値）" : "jev-latest"}
          </span>
        </div>
        <span className={arrow} aria-hidden>
          →
        </span>
        <ul className="flex flex-wrap items-center gap-2">
          {KIND_ORDER.map((kind) => {
            const type = QUESTION_KINDS[kind];
            const inUse = used.has(kind);
            return (
              <li
                key={kind}
                className={`rounded-full border px-3 py-1 text-sm ${inUse ? "" : "border-rule text-mist opacity-50"}`}
                style={inUse ? { borderColor: type.tone, color: type.tone } : undefined}
              >
                <span className="font-bold">{type.name}</span>「{type.nickname}」
                {!inUse && <span className="ml-1 text-xs">未使用</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
