import https from "node:https";
import type {
  AnalysisRequest,
  AnalysisResult,
  CumulativeAnalysisRequest,
  InlineQuery,
  SavedQuery,
  SavedQueryDetail,
} from "./types";

interface TenableScConfig {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
  rejectUnauthorized?: boolean;
}

interface TenableScResponse<T> {
  type: "regular" | "error";
  response: T;
  error_code: number;
  error_msg: string;
  warnings: string[];
  timestamp: number;
}

export class TenableScClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private agent: https.Agent;

  constructor(config: TenableScConfig) {
    this.baseUrl = `${config.baseUrl}/rest`;
    this.headers = {
      "Content-Type": "application/json",
      "x-apikey": `accesskey=${config.accessKey}; secretkey=${config.secretKey};`,
    };
    // SC is commonly deployed with self-signed certs
    this.agent = new https.Agent({
      rejectUnauthorized: config.rejectUnauthorized ?? false,
    });
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
      // @ts-expect-error — Node fetch accepts agent
      agent: this.agent,
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      // @ts-expect-error
      agent: this.agent,
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
      // @ts-expect-error
      agent: this.agent,
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.headers,
      // @ts-expect-error
      agent: this.agent,
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const data: TenableScResponse<T> = await res.json();
    if (!res.ok || data.error_code !== 0) {
      throw new Error(
        `Tenable SC error ${data.error_code}: ${data.error_msg}`
      );
    }
    if (data.warnings?.length) {
      console.error("[tenable-sc] warnings:", data.warnings);
    }
    return data.response;
  }

  // ── Query API ──────────────────────────────────────────────────────────────

  async listQueries(
    type = "all"
  ): Promise<{ usable: SavedQuery[]; manageable: SavedQuery[] }> {
    return this.get("/query", { type });
  }

  async getQuery(id: number): Promise<SavedQueryDetail> {
    return this.get(`/query/${id}`);
  }

  async createQuery(body: {
    name: string;
    type: string;
    tool: string;
    filters?: unknown[];
    description?: string;
    tags?: string;
  }): Promise<SavedQueryDetail> {
    return this.post("/query", body);
  }

  async updateQuery(
    id: number,
    body: Partial<{
      name: string;
      description: string;
      tool: string;
      filters: unknown[];
      tags: string;
    }>
  ): Promise<SavedQueryDetail> {
    return this.patch(`/query/${id}`, body);
  }

  async deleteQuery(id: number): Promise<void> {
    return this.delete(`/query/${id}`);
  }

  async listQueryTags(): Promise<string[]> {
    return this.get("/query/tag");
  }

  // ── Analysis API ───────────────────────────────────────────────────────────

  async analysis<T = unknown>(
    request: AnalysisRequest
  ): Promise<AnalysisResult<T>> {
    return this.post<AnalysisResult<T>>("/analysis", request);
  }

  // Auto-paginates — yields one page of results at a time.
  // Only supports cumulative/patched sourceType (individual scans don't
  // paginate the same way).
  async *analysisPaged<T = unknown>(
    request: CumulativeAnalysisRequest,
    pageSize = 1000
  ): AsyncGenerator<T[]> {
    let offset = 0;
    while (true) {
      const page = await this.analysis<T>({
        ...request,
        startOffset: offset,
        endOffset: offset + pageSize,
        query:
          "id" in request.query
            ? request.query
            : {
                ...(request.query as InlineQuery),
                startOffset: offset,
                endOffset: offset + pageSize,
              },
      } as CumulativeAnalysisRequest);

      if (page.results.length > 0) yield page.results;
      offset += pageSize;
      if (offset >= parseInt(page.totalRecords, 10)) break;
    }
  }
}
