import type { ScoreResponse } from "@typesafe-ai/sdk";
import { CardFrame, cssVars } from "@/components/answers/CardFrame";
import { formatPercent, formatScore } from "@/lib/format";
import type { ScoreQuestionMeta } from "@/lib/scenarios";

interface ScoreCardProps {
  meta: ScoreQuestionMeta;
  answer: ScoreResponse | undefined;
}

export function ScoreCard({ meta, answer }: ScoreCardProps) {
  const top = meta.levels.length - 1;
  const probabilities = meta.levels.map((_, level) => answer?.probabilities[level]);
  const peak = answer ? probabilities.indexOf(Math.max(...(probabilities as number[]))) : -1;

  return (
    <CardFrame
      kind="score"
      meta={meta}
      confidence={answer?.confidence}
      literal={answer ? `score: ${answer.score}` : "score: ?"}
    >
      <p className="flex items-baseline gap-2">
        <span className="readout text-[3.2rem]">{answer ? formatScore(answer.score) : "?"}</span>
        <span className="readout text-2xl text-fog">/ {top}</span>
      </p>

      {/* 段階ごとの確率（柱）と、score（確率で重み付けした平均）を指す目盛り */}
      <div className="score-gauge mt-3" style={cssVars({ levels: meta.levels.length })} aria-hidden>
        <div className="score-histogram">
          {probabilities.map((probability, level) => (
            <div key={level} className="score-column">
              {probability !== undefined && (
                <div
                  className={`score-bar ${level === peak ? "is-peak" : ""}`}
                  style={cssVars({ value: `${probability * 100}%` })}
                />
              )}
            </div>
          ))}
        </div>
        <div
          className="score-ruler"
          style={cssVars({ value: answer ? `${(answer.score / top) * 100}%` : "0%" })}
        >
          {answer && (
            <>
              <div className="score-ruler-fill" />
              <div className="score-pointer" />
            </>
          )}
        </div>
        <div className="score-ticks font-mono text-sm text-mist">
          {meta.levels.map((_, level) => (
            <span key={level} style={{ left: `${(level / top) * 100}%` }}>
              {level}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-3 flex flex-col gap-1">
        {meta.levels.map((description, level) => {
          const probability = probabilities[level];
          return (
            <li
              key={level}
              className={`grid grid-cols-[1.4rem_1fr_auto] items-baseline gap-2 ${
                level === peak ? "font-bold text-paper" : "text-fog"
              }`}
            >
              <span className="font-mono text-sm text-mist">{level}</span>
              <span className="text-base">{description}</span>
              <span className="readout text-base">
                {probability === undefined ? "—" : formatPercent(probability)}
              </span>
            </li>
          );
        })}
      </ol>
    </CardFrame>
  );
}
