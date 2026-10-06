import type { CSSProperties, ReactNode } from "react";
import { formatConfidence } from "@/lib/format";
import { QUESTION_KINDS } from "@/lib/question-kinds";
import type { QuestionKind, QuestionMeta } from "@/lib/scenarios";

interface CardFrameProps {
  kind: QuestionKind;
  meta: QuestionMeta;
  /** Choice / Score のレスポンスに含まれる confidence（Noul にはない） */
  confidence: number | undefined;
  /** Jev が返した型付きの値（例: choice: "bug"） */
  literal: string;
  note?: string;
  children: ReactNode;
}

export function CardFrame({ kind, meta, confidence, literal, note, children }: CardFrameProps) {
  const type = QUESTION_KINDS[kind];
  return (
    <article
      className="flex flex-col rounded-3xl border border-rule bg-ink-900 p-5"
      style={{ "--tone": type.tone } as CSSProperties}
      aria-label={`${type.name}: ${meta.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold"
          style={{ borderColor: type.tone, color: type.tone }}
        >
          {type.name}
          <span className="font-normal">「{type.nickname}」</span>
        </span>
        {confidence !== undefined && (
          <span
            className="text-sm text-fog"
            title="Jevが返した判断の確信度（確率分布の集中度）です。正解である確率ではありません。"
          >
            確信度 <span className="readout text-base text-paper">{formatConfidence(confidence)}</span>
          </span>
        )}
      </div>
      <h3 className="mt-2.5 text-[1.45rem] leading-snug font-bold">{meta.label}</h3>
      <p className="mt-0.5 text-base text-fog">{meta.question}</p>
      <div className="mt-4 flex-1">{children}</div>
      <p className="mt-4 border-t border-rule pt-3 font-mono text-sm text-mist">
        <span aria-hidden>→ </span>
        {literal}
      </p>
      {note && <p className="mt-1 text-xs text-mist">{note}</p>}
    </article>
  );
}

/** CSS 変数を style に渡すためのヘルパー */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return Object.fromEntries(
    Object.entries(vars).map(([name, value]) => [`--${name}`, value]),
  ) as CSSProperties;
}
