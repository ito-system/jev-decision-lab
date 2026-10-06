// 結果表示用の整形。プロジェクターで読み取りやすいよう、桁数を絞って表示する。

/** 確率を % で表示する。0 や 1 ではない極端な値は 0% / 100% と区別できるようにする */
export function formatPercent(probability: number): string {
  const percent = Math.round(probability * 100);
  if (percent === 0 && probability > 0) return "<1%";
  if (percent === 100 && probability < 1) return ">99%";
  return `${percent}%`;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatConfidence(confidence: number): string {
  return confidence.toFixed(2);
}

export function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}秒`;
}
