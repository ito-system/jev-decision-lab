// 公式ドキュメント（https://docs.typesafe.ai/confidence）の計算式。
// Jev API はこの値を confidence として返す。モックの値を実際のレスポンスと同じ規則で作るために使う。

/** Choice: トップの確率が均等割り (1/n) からどれだけ離れているか */
export function choiceConfidence(probabilities: readonly number[]): number {
  const n = probabilities.length;
  return (Math.max(...probabilities) - 1 / n) / (1 - 1 / n);
}

/** Score: 最も確率の高い段階からの平均距離を、均等分布の場合と比べる */
export function scoreConfidence(probabilities: readonly number[]): number {
  const n = probabilities.length;
  const peak = probabilities.indexOf(Math.max(...probabilities));
  const spread = probabilities.reduce((sum, p, i) => sum + p * Math.abs(i - peak), 0);
  let evenSpread = 0;
  for (let i = 0; i < n; i++) evenSpread += Math.abs(i - (n - 1) / 2);
  evenSpread /= n;
  return Math.max(0, 1 - spread / evenSpread);
}

/** Score の score: 段階の番号を確率で重み付けした平均（段階の間の値にもなる） */
export function expectedScore(probabilities: readonly number[]): number {
  return probabilities.reduce((sum, p, i) => sum + i * p, 0);
}
