import "server-only";

import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@typesafe-ai/sdk";
import type { DecideError, DecideErrorCode } from "@/lib/types";

type ServiceErrorCode = Exclude<DecideErrorCode, "INVALID_REQUEST">;

// ブラウザに返すのはこの固定メッセージだけ。APIキーや Jev API の内部メッセージは含めない。
const PUBLIC_ERRORS: Record<ServiceErrorCode, { status: number; message: string }> = {
  MISSING_API_KEY: { status: 503, message: "Jev APIキーが設定されていません。" },
  AUTH_FAILED: {
    status: 502,
    message: "Jev APIの認証に失敗しました。APIキーを確認してください。",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Jev APIのレート制限に達しました。少し待ってから、もう一度お試しください。",
  },
  CONNECTION_FAILED: { status: 504, message: "Jev APIへの接続に失敗しました。" },
  UPSTREAM_ERROR: { status: 502, message: "Jev APIからエラーが返されました。" },
  INTERNAL_ERROR: { status: 500, message: "判断中に予期しないエラーが発生しました。" },
};

export class JevServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status: number;

  constructor(code: ServiceErrorCode, options?: ErrorOptions) {
    super(PUBLIC_ERRORS[code].message, options);
    this.name = "JevServiceError";
    this.code = code;
    this.status = PUBLIC_ERRORS[code].status;
  }

  toPublic(): DecideError {
    return { code: this.code, message: this.message, canUseDemo: true };
  }
}

/** SDK の例外を、画面に出せるエラーに変換する */
export function toJevServiceError(error: unknown): JevServiceError {
  if (error instanceof JevServiceError) return error;
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new JevServiceError("AUTH_FAILED", { cause: error });
  }
  if (error instanceof RateLimitError) return new JevServiceError("RATE_LIMITED", { cause: error });
  // APITimeoutError も APIConnectionError の一種
  if (error instanceof APIConnectionError) {
    return new JevServiceError("CONNECTION_FAILED", { cause: error });
  }
  if (error instanceof APIError) return new JevServiceError("UPSTREAM_ERROR", { cause: error });
  return new JevServiceError("INTERNAL_ERROR", { cause: error });
}

/** サーバーログ用の詳細。ブラウザには返さない。 */
export function describeForLog(error: JevServiceError): Record<string, unknown> {
  const cause = error.cause;
  return {
    code: error.code,
    cause: cause instanceof Error ? cause.name : typeof cause,
    message: cause instanceof Error ? cause.message : undefined,
    status: cause instanceof APIError ? cause.status : undefined,
    requestId: cause instanceof APIError ? cause.requestId : undefined,
  };
}
