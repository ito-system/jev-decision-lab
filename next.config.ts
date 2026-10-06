import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 勉強会で `npm run dev` のまま投影しても、開発用のバッジが映り込まないようにする
  devIndicators: false,
  poweredByHeader: false,
};

export default nextConfig;
