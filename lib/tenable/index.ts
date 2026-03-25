import { TenableScClient } from "./client";

const SC_BASE_URL = "https://test.streamtrendy.com";

export function createTenableClient(accessKey: string, secretKey: string): TenableScClient {
  return new TenableScClient({ baseUrl: SC_BASE_URL, accessKey, secretKey });
}

export * from "./types";
export * from "./client";
