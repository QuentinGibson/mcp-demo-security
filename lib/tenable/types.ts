export type AnalysisType = "vuln" | "event" | "user" | "mobile";
export type SourceType = "cumulative" | "patched" | "individual" | "lce" | "archive";
export type SortDir = "ASC" | "DESC";

export type VulnTool =
  | "vulndetails" | "listvuln"
  | "sumip" | "sumasset" | "sumid" | "sumseverity"
  | "sumfamily" | "sumcve" | "summsbulletin"
  | "sumport" | "sumprotocol" | "sumremediation"
  | "remediationdetail" | "iplist" | "listos"
  | "listservices" | "listsoftware" | "vulnipdetail"
  | "vulnipsummary" | "trend";

export interface QueryFilter {
  filterName: string;
  operator: string;
  value: string | number | { id: number }[] | object;
}

export interface InlineQuery {
  type: AnalysisType;
  tool: VulnTool | string;
  startOffset: number;
  endOffset: number;
  filters?: QueryFilter[];
  name?: string;
  description?: string;
  context?: string;
  groups?: unknown[];
  sortField?: string;
  sortDir?: SortDir;
}

export interface CumulativeAnalysisRequest {
  type: "vuln";
  sourceType: "cumulative" | "patched";
  query: { id: number } | InlineQuery;
  startOffset: number;
  endOffset: number;
  sortField?: string;
  sortDir?: SortDir;
  columns?: { name: string }[];
}

export interface IndividualScanAnalysisRequest {
  type: "vuln";
  sourceType: "individual";
  query: { id: number } | InlineQuery;
  scanID: number;
  view: "all" | "new" | "patched";
  startOffset: number;
  endOffset: number;
  sortField?: string;
  sortDir?: SortDir;
}

export type AnalysisRequest =
  | CumulativeAnalysisRequest
  | IndividualScanAnalysisRequest;

export interface AnalysisResult<T = unknown> {
  totalRecords: string; // NOTE: string, not number — always parseInt()
  returnedRecords: number;
  startOffset: number;
  endOffset: number;
  results: T[];
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
}

export interface SavedQueryDetail extends SavedQuery {
  tool: string;
  type: string;
  tags: string;
  filters: QueryFilter[];
  canManage: string; // "true" | "false" — strings, not booleans
  canUse: string;
  createdTime: string;
  modifiedTime: string;
  creator: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    uuid: string;
  };
  owner: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    uuid: string;
  };
}
