import { connection } from "next/server";
import { DecisionLab } from "@/components/DecisionLab";
import { getServerMode } from "@/lib/jev/config";

export default async function Page({ searchParams }: PageProps<"/">) {
  // JEV_DEMO_MODE をビルド時ではなくリクエスト時に読む（再ビルドなしでモードを切り替えるため）
  await connection();
  const serverMode = getServerMode();
  const { mode } = await searchParams;
  // ?mode=demo は、画面右上のバッジで DEMO に切り替えたときに付く（再読み込みしても DEMO のまま）
  const initialMode = serverMode === "mock" || mode === "demo" ? "mock" : "live";

  return <DecisionLab serverMode={serverMode} initialMode={initialMode} />;
}
