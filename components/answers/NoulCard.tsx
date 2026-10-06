import type { NoulResponse } from "@typesafe-ai/sdk";
import { CardFrame, cssVars } from "@/components/answers/CardFrame";
import { formatPercent } from "@/lib/format";
import type { NoulQuestionMeta } from "@/lib/scenarios";

interface NoulCardProps {
  meta: NoulQuestionMeta;
  answer: NoulResponse | undefined;
}

export function NoulCard({ meta, answer }: NoulCardProps) {
  const probability = answer?.noul;

  return (
    <CardFrame
      kind="noul"
      meta={meta}
      confidence={undefined}
      literal={answer ? `noul: ${answer.noul}` : "noul: ?"}
      note="Noul が返すのは「YES である確率」だけです（confidence はありません）。"
    >
      <p className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tracking-wider text-lagoon">YES</span>
        <span className="readout text-[3.2rem]">
          {probability === undefined ? "?" : formatPercent(probability)}
        </span>
      </p>
      <div className="noul-meter mt-4">
        <div className="bar-track" style={cssVars({ "bar-height": "1.1rem" })}>
          {probability !== undefined && (
            <div className="bar-fill" style={cssVars({ value: `${probability * 100}%` })} />
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-sm text-mist" aria-hidden>
        <span>NO</span>
        <span>50%</span>
        <span>YES</span>
      </div>
    </CardFrame>
  );
}
