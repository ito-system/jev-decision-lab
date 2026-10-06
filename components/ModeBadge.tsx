import type { JevMode } from "@/lib/types";

interface ModeBadgeProps {
  mode: JevMode;
  /** サーバーが LIVE のときだけ、クリックで LIVE / DEMO を切り替えられる */
  canSwitch: boolean;
  onSwitch: (mode: JevMode) => void;
}

export function ModeBadge({ mode, canSwitch, onSwitch }: ModeBadgeProps) {
  const isLive = mode === "live";
  const description = isLive
    ? "LIVE: Jev API を呼び出して判断しています。"
    : "DEMO: Jev API は呼び出さず、事前定義のサンプル値を表示しています。";
  const hint = !canSwitch
    ? "（JEV_DEMO_MODE=mock で起動中）"
    : isLive
      ? "クリックで DEMO に切り替えます。"
      : "クリックで LIVE に戻します。";

  const content = isLive ? (
    <>
      <span className="pulse-dot size-2.5 rounded-full bg-coral" aria-hidden />
      LIVE
    </>
  ) : (
    <>
      <span className="hatch size-2.5 rounded-full bg-fog" aria-hidden />
      DEMO
    </>
  );

  const className = `inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-sm font-semibold tracking-wider ${
    isLive ? "border-coral/60 text-paper" : "hatch border-fog/50 bg-ink-800 text-paper"
  }`;

  if (!canSwitch) {
    return (
      <span className={className} title={`${description}${hint}`}>
        {content}
        <span className="sr-only">{description}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`${className} cursor-pointer transition-colors hover:border-paper`}
      title={`${description}${hint}`}
      aria-label={`${description}${hint}`}
      onClick={() => onSwitch(isLive ? "mock" : "live")}
    >
      {content}
    </button>
  );
}
