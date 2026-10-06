import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// すべてのページと API をリクエストごとに処理するため、ISR 用のキャッシュ（R2 など）は使わない
export default defineCloudflareConfig({});
