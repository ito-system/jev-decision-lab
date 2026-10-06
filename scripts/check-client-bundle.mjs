// ブラウザに配信されるファイル（.next/static）に、APIキーや Jev SDK の実行コードが
// 含まれていないかを確認する。`npm run build` のあとに `npm run check:bundle` で実行する。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".next/static";
const apiKey = process.env.TYPESAFE_API_KEY?.trim();

const forbidden = [
  ["TYPESAFE_API_KEY", "APIキーの環境変数名（SDK の実行コードが混入している可能性）"],
  ["api.typesafe.ai", "Jev API の URL（ブラウザから直接呼ぶコードが混入している可能性）"],
  ["dangerouslyAllowBrowser", "Jev SDK クライアントの実行コード"],
];
if (apiKey && apiKey.length >= 8) forbidden.push([apiKey, "TYPESAFE_API_KEY の値そのもの"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let checked = 0;
const problems = [];
try {
  for (const file of walk(root)) {
    if (!/\.(m?js|css|html|json|txt|map)$/.test(file)) continue;
    checked++;
    const content = readFileSync(file, "utf8");
    for (const [needle, label] of forbidden) {
      if (content.includes(needle)) problems.push(`${file}: ${label}`);
    }
  }
} catch {
  // root が存在しない場合は下の checked === 0 で案内する
}

if (checked === 0) {
  console.error(`${root} にファイルがありません。先に npm run build を実行してください。`);
  process.exit(1);
}
if (problems.length > 0) {
  console.error("ブラウザ向けのファイルに、含めてはいけない文字列が見つかりました:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `OK: ブラウザ向けの ${checked} ファイルに、APIキー・Jev SDK の実行コードは含まれていません` +
    (apiKey ? "（APIキーの値も照合済み）" : "（APIキー未設定のため、値の照合はスキップ）"),
);
