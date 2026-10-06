import type { KeyboardEvent } from "react";
import type { ScenarioMeta } from "@/lib/scenarios";
import { MAX_TEXT_LENGTH } from "@/lib/validation";

interface ScenarioInputProps {
  scenario: ScenarioMeta;
  text: string;
  deciding: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}

export function ScenarioInput({ scenario, text, deciding, onChange, onSubmit }: ScenarioInputProps) {
  const inputId = `input-${scenario.id}`;
  const length = text.trim().length;
  const tooLong = length > MAX_TEXT_LENGTH;
  const canSubmit = length > 0 && !tooLong && !deciding;

  function submitWithShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="rounded-3xl border border-rule bg-ink-900 p-4 lg:px-6 lg:py-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow">State</span>
        <h2 id={`${inputId}-heading`} className="text-xl font-bold">
          {scenario.heading}
        </h2>
        <p className="text-base text-fog">{scenario.lead}</p>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="mr-2 text-base font-bold">
            {scenario.inputLabel}
          </label>
          <span className="text-sm text-mist">プリセット</span>
          {scenario.presets.map((preset) => {
            const selected = text.trim() === preset.text;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.text}
                aria-pressed={selected}
                onClick={() => onChange(preset.text)}
                className={`cursor-pointer rounded-full border px-3.5 py-0.5 text-base transition-colors ${
                  selected
                    ? "border-paper bg-ink-800 text-paper"
                    : "border-rule text-fog hover:border-fog hover:text-paper"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="hidden self-end text-right text-xs text-mist md:block">
          ⌘ / Ctrl + Enter でも実行できます
        </p>
        <div className="flex flex-col gap-1">
          <textarea
            id={inputId}
            value={text}
            rows={2}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={submitWithShortcut}
            placeholder="ここに入力します"
            aria-describedby={`${inputId}-count`}
            className="w-full resize-y rounded-2xl border border-rule bg-ink-950 px-4 py-2.5 text-[1.35rem] leading-relaxed text-paper placeholder:text-mist focus:border-iris focus:outline-none"
          />
          <span
            id={`${inputId}-count`}
            className={`self-end font-mono text-xs ${tooLong ? "text-coral" : "text-mist"}`}
          >
            {length} / {MAX_TEXT_LENGTH}
          </span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mb-5 min-h-16 cursor-pointer rounded-2xl bg-paper px-6 py-3 text-[1.3rem] font-bold text-ink-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Jevに判断してもらう
        </button>
      </div>
    </section>
  );
}
