"use client";

import { useRef, useState } from "react";
import { FlowDiagram } from "@/components/FlowDiagram";
import { ModeBadge } from "@/components/ModeBadge";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ScenarioInput } from "@/components/ScenarioInput";
import { ScenarioTabs } from "@/components/ScenarioTabs";
import { requestDecision } from "@/lib/request-decision";
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { DecideError, DecisionResult, JevMode } from "@/lib/types";

export type RunState =
  | { status: "idle" }
  | { status: "deciding" }
  | { status: "done"; result: DecisionResult; runId: number }
  | { status: "error"; error: DecideError; mode: JevMode };

/** 判断中の表示が一瞬で消えないよう、最低限これだけは表示する */
const MIN_DECIDING_MS = 450;

const perScenario = <T,>(make: (id: ScenarioId) => T) =>
  Object.fromEntries(SCENARIO_IDS.map((id) => [id, make(id)])) as Record<ScenarioId, T>;

interface DecisionLabProps {
  /** サーバーの JEV_DEMO_MODE */
  serverMode: JevMode;
  initialMode: JevMode;
}

export function DecisionLab({ serverMode, initialMode }: DecisionLabProps) {
  const [active, setActive] = useState<ScenarioId>("inquiry");
  const [mode, setMode] = useState<JevMode>(initialMode);
  const [texts, setTexts] = useState(() => perScenario((id) => SCENARIOS[id].defaultText));
  const [runs, setRuns] = useState(() => perScenario<RunState>(() => ({ status: "idle" })));
  // 入力が変わったら、実行中のリクエストの結果は捨てる
  const tickets = useRef(perScenario(() => 0));

  const canSwitchMode = serverMode === "live";
  const scenario = SCENARIOS[active];
  const run = runs[active];

  function switchMode(next: JevMode) {
    if (!canSwitchMode) return;
    setMode(next);
    const url = new URL(window.location.href);
    if (next === "mock") url.searchParams.set("mode", "demo");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  }

  async function decide(id: ScenarioId, requestedMode: JevMode = mode) {
    const text = texts[id].trim();
    if (!text) return;
    const ticket = ++tickets.current[id];
    setRuns((prev) => ({ ...prev, [id]: { status: "deciding" } }));

    const started = performance.now();
    const response = await requestDecision({
      scenario: id,
      text,
      mode: requestedMode === "mock" ? "mock" : undefined,
    });
    const remaining = MIN_DECIDING_MS - (performance.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (tickets.current[id] !== ticket) return;

    setRuns((prev) => ({
      ...prev,
      [id]: response.ok
        ? { status: "done", result: response.result, runId: ticket }
        : { status: "error", error: response.error, mode: requestedMode },
    }));
  }

  function changeText(id: ScenarioId, text: string) {
    tickets.current[id]++;
    setTexts((prev) => ({ ...prev, [id]: text }));
    setRuns((prev) => (prev[id].status === "idle" ? prev : { ...prev, [id]: { status: "idle" } }));
  }

  function continueInDemo() {
    switchMode("mock");
    void decide(active, "mock");
  }

  return (
    <div className="md:pb-28">
      <header className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-8 gap-y-3 px-6 pt-5 lg:px-10">
        <div className="mr-auto">
          <h1 className="text-[2.3rem] leading-tight font-extrabold tracking-tight">
            Jev Decision Lab
          </h1>
          <p className="text-lg text-fog">文章を書かないAIに、判断してもらう。</p>
        </div>
        <ScenarioTabs active={active} onSelect={setActive} />
        <ModeBadge mode={mode} canSwitch={canSwitchMode} onSwitch={switchMode} />
      </header>

      <main
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="mx-auto flex max-w-[100rem] flex-col gap-4 px-6 pt-4 lg:px-10"
      >
        <ScenarioInput
          key={active}
          scenario={scenario}
          text={texts[active]}
          deciding={run.status === "deciding"}
          onChange={(text) => changeText(active, text)}
          onSubmit={() => void decide(active)}
        />
        <ResultsPanel
          scenario={scenario}
          run={run}
          mode={mode}
          canContinueInDemo={canSwitchMode && mode === "live"}
          onContinueInDemo={continueInDemo}
          onRetry={() => void decide(active)}
        />
      </main>

      <FlowDiagram scenario={scenario} mode={mode} deciding={run.status === "deciding"} />
    </div>
  );
}
