import type { ChoiceResponse } from "@typesafe-ai/sdk";
import { CardFrame, cssVars } from "@/components/answers/CardFrame";
import { formatPercent } from "@/lib/format";
import type { ChoiceQuestionMeta } from "@/lib/scenarios";

interface ChoiceCardProps {
  meta: ChoiceQuestionMeta;
  answer: ChoiceResponse | undefined;
}

export function ChoiceCard({ meta, answer }: ChoiceCardProps) {
  // 結果が出たら確率の高い順に並べる。出る前は質問の候補順。
  const rows = answer
    ? [...meta.options].sort((a, b) => answer.probabilities[b.key] - answer.probabilities[a.key])
    : meta.options;

  return (
    <CardFrame
      kind="choice"
      meta={meta}
      confidence={answer?.confidence}
      literal={answer ? `choice: "${answer.choice}"` : "choice: ?"}
    >
      <ul className="flex flex-col gap-3">
        {rows.map((option) => {
          const probability = answer?.probabilities[option.key];
          const selected = answer?.choice === option.key;
          return (
            <li key={option.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={selected ? "text-[1.6rem] font-bold" : "text-lg text-fog"}>
                  {option.label}
                  <span className="ml-2 text-sm font-normal text-mist">{option.sublabel}</span>
                </span>
                <span className={`readout ${selected ? "text-[1.9rem]" : "text-lg text-fog"}`}>
                  {probability === undefined ? "—" : formatPercent(probability)}
                </span>
              </div>
              <div
                className="bar-track mt-1.5"
                style={cssVars({ "bar-height": selected ? "1rem" : "0.6rem" })}
              >
                {probability !== undefined && (
                  <div
                    className={`bar-fill ${selected ? "" : "is-muted"}`}
                    style={cssVars({ value: `${probability * 100}%` })}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </CardFrame>
  );
}
