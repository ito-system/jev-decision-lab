import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Next.js と同じく .env.local から TYPESAFE_API_KEY を読む（すでに設定済みの環境変数が優先）
if (existsSync(".env.local")) loadEnvFile(".env.local");
