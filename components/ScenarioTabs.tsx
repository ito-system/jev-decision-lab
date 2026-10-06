import { useRef, type KeyboardEvent } from "react";
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from "@/lib/scenarios";

interface ScenarioTabsProps {
  active: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}

export function ScenarioTabs({ active, onSelect }: ScenarioTabsProps) {
  const buttons = useRef<Partial<Record<ScenarioId, HTMLButtonElement | null>>>({});

  function moveFocus(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = SCENARIO_IDS[(index + step + SCENARIO_IDS.length) % SCENARIO_IDS.length];
    onSelect(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="デモの題材"
      className="inline-flex flex-wrap gap-1 rounded-2xl border border-rule bg-ink-900 p-1.5"
    >
        {SCENARIO_IDS.map((id, index) => {
          const selected = id === active;
          return (
            <button
              key={id}
              ref={(element) => {
                buttons.current[id] = element;
              }}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(id)}
              onKeyDown={(event) => moveFocus(event, index)}
              className={`cursor-pointer rounded-xl px-5 py-2 text-lg font-bold transition-colors ${
                selected
                  ? "bg-paper text-ink-950"
                  : "text-fog hover:bg-ink-800 hover:text-paper"
              }`}
            >
              {SCENARIOS[id].tabLabel}
            </button>
          );
        })}
    </div>
  );
}
