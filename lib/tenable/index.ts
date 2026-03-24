import { TenableScClient } from "./client";

if (!process.env.SC_BASE_URL) throw new Error("Missing SC_BASE_URL");
if (!process.env.SC_ACCESS_KEY) throw new Error("Missing SC_ACCESS_KEY");
if (!process.env.SC_SECRET_KEY) throw new Error("Missing SC_SECRET_KEY");

// Singleton — one client per server process
export const tenableClient = new TenableScClient({
  baseUrl: process.env.SC_BASE_URL,
  accessKey: process.env.SC_ACCESS_KEY,
  secretKey: process.env.SC_SECRET_KEY,
});

export * from "./types";
export * from "./client";
