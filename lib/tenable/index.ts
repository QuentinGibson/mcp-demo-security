import { TenableScClient } from "./client";

export function createTenableClient(baseUrl: string, accessKey: string, secretKey: string): TenableScClient {
  return new TenableScClient({ baseUrl, accessKey, secretKey });
}

export * from "./types";
export * from "./client";
