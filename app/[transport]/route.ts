import { createMcpHandler } from "mcp-handler";
import { headers } from "next/headers";
import z from "zod";
import { createTenableClient } from "@/lib/tenable";

function getTenableClient() {
	const h = headers();
	const accessKey = h.get("x-sc-access-key");
	const secretKey = h.get("x-sc-secret-key");
	if (!accessKey || !secretKey)
		throw new Error(
			"Missing required headers: x-sc-access-key and x-sc-secret-key"
		);
	return createTenableClient(accessKey, secretKey);
}

const handler = createMcpHandler(
	(server) => {
		server.registerTool(
			"tenable_list_queries",
			{
				title: "List Tenable Queries",
				description:
					"List saved queries in Tenable Security Center. Returns both usable and manageable queries.",
				inputSchema: {
					type: z
						.enum(["all", "vuln", "lce", "alert", "mobile", "ticket", "user"])
						.default("all")
						.describe("Filter by query type"),
				},
			},
			async ({ type }) => {
				const result = await getTenableClient().listQueries(type);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		server.registerTool(
			"tenable_get_query",
			{
				title: "Get Tenable Query",
				description: "Get the full definition of a saved query by its numeric ID.",
				inputSchema: {
					id: z.number().describe("Numeric query ID"),
				},
			},
			async ({ id }) => {
				const result = await getTenableClient().getQuery(id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		server.registerTool(
			"tenable_list_query_tags",
			{
				title: "List Tenable Query Tags",
				description: "Get all unique tags that have been applied to saved queries.",
				inputSchema: {},
			},
			async () => {
				const tags = await getTenableClient().listQueryTags();
				return {
					content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
				};
			}
		);

		server.registerTool(
			"tenable_run_analysis",
			{
				title: "Run Tenable Analysis",
				description:
					"Run a single-page vulnerability analysis query against Tenable Security Center. " +
					"Best for summary tools (sumip, sumseverity, sumfamily, sumcve, sumasset). " +
					"For full detail exports use tenable_run_analysis_paged instead.",
				inputSchema: {
					sourceType: z
						.enum(["cumulative", "patched", "individual"])
						.default("cumulative")
						.describe(
							"cumulative = active vulns, patched = mitigated vulns, individual = specific scan result"
						),
					queryId: z
						.number()
						.optional()
						.describe("ID of a saved query. If provided, filters are ignored."),
					tool: z
						.string()
						.default("vulndetails")
						.describe(
							"Analysis tool. Summary tools: sumip, sumasset, sumseverity, sumfamily, sumcve, summsbulletin, sumport, sumprotocol. " +
							"Detail tools: vulndetails, listvuln, vulnipdetail, vulnipsummary."
						),
					filters: z
						.array(
							z.object({
								filterName: z.string().describe("e.g. severity, ip, pluginID, exploitAvailable, lastSeen"),
								operator: z.string().describe("e.g. =, !=, >=, <="),
								value: z.string().describe("e.g. '4' for critical, 'true', '0:30' for last 30 days"),
							})
						)
						.optional()
						.describe("Filters to apply. Ignored if queryId is set."),
					startOffset: z.number().default(0).describe("Pagination start (0-based)"),
					endOffset: z.number().default(100).describe("Pagination end"),
					sortField: z.string().optional().describe("Field to sort by, e.g. severity"),
					sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
					scanID: z
						.number()
						.optional()
						.describe("Required when sourceType is 'individual'"),
					view: z
						.enum(["all", "new", "patched"])
						.optional()
						.describe("Required when sourceType is 'individual'"),
				},
			},
			async ({
				sourceType, queryId, tool, filters,
				startOffset, endOffset, sortField, sortDir,
				scanID, view,
			}) => {
				if (sourceType === "individual" && (!scanID || !view)) {
					throw new Error("scanID and view are required when sourceType is 'individual'");
				}

				const query = queryId
					? { id: queryId }
					: {
							type: "vuln" as const,
							tool,
							startOffset,
							endOffset,
							filters: filters ?? [],
					  };

				const request =
					sourceType === "individual"
						? {
								type: "vuln" as const,
								sourceType: "individual" as const,
								query,
								scanID: scanID!,
								view: view!,
								startOffset,
								endOffset,
								...(sortField && { sortField, sortDir }),
						  }
						: {
								type: "vuln" as const,
								sourceType,
								query,
								startOffset,
								endOffset,
								...(sortField && { sortField, sortDir }),
						  };

				const result = await getTenableClient().analysis(request);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		server.registerTool(
			"tenable_run_analysis_paged",
			{
				title: "Run Tenable Analysis (All Pages)",
				description:
					"Paginate through all vulnerability results from Tenable Security Center. " +
					"Use this for detail tools like vulndetails or listvuln that can return thousands of rows. " +
					"maxRecords caps the total to avoid overwhelming the response.",
				inputSchema: {
					sourceType: z
						.enum(["cumulative", "patched"])
						.default("cumulative")
						.describe("cumulative = active vulns, patched = mitigated/remediated vulns"),
					queryId: z
						.number()
						.optional()
						.describe("ID of a saved query. If provided, filters are ignored."),
					tool: z
						.string()
						.default("vulndetails")
						.describe("Analysis tool — vulndetails and listvuln are the most common for paged exports"),
					filters: z
						.array(
							z.object({
								filterName: z.string(),
								operator: z.string(),
								value: z.string(),
							})
						)
						.optional(),
					pageSize: z
						.number()
						.default(1000)
						.describe("Records per API call. Max 1000."),
					maxRecords: z
						.number()
						.default(5000)
						.describe("Hard cap on total records returned across all pages."),
					sortField: z.string().optional(),
					sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
				},
			},
			async ({ sourceType, queryId, tool, filters, pageSize, maxRecords, sortField, sortDir }) => {
				const baseRequest = {
					type: "vuln" as const,
					sourceType,
					query: queryId
						? { id: queryId }
						: {
								type: "vuln" as const,
								tool,
								startOffset: 0,
								endOffset: pageSize,
								filters: filters ?? [],
						  },
					startOffset: 0,
					endOffset: pageSize,
					...(sortField && { sortField, sortDir }),
				};

				const allResults: unknown[] = [];
				for await (const page of getTenableClient().analysisPaged(baseRequest, pageSize)) {
					allResults.push(...page);
					if (allResults.length >= maxRecords) break;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{ totalFetched: allResults.length, results: allResults },
								null,
								2
							),
						},
					],
				};
			}
		);

		server.registerTool(
			"tenable_create_query",
			{
				title: "Create Tenable Query",
				description: "Save a new named query in Tenable Security Center for later reuse.",
				inputSchema: {
					name: z.string().describe("Display name for the query"),
					type: z
						.enum(["vuln", "lce", "alert", "mobile", "ticket", "user"])
						.describe("Query data type"),
					tool: z.string().describe("Analysis tool to associate with this query, e.g. vulndetails"),
					filters: z
						.array(
							z.object({
								filterName: z.string(),
								operator: z.string(),
								value: z.string(),
							})
						)
						.default([]),
					description: z.string().default("").describe("Optional description"),
					tags: z.string().default("").describe("Comma-separated tags"),
				},
			},
			async ({ name, type, tool, filters, description, tags }) => {
				const result = await getTenableClient().createQuery({
					name, type, tool, filters, description, tags,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);
	},
	{
		capabilities: {
			tools: {},
		},
	},
	{
		redisUrl: process.env.REDIS_URL,
		basePath: "/",
		verboseLogs: true,
		maxDuration: 60,
	},
);

export { handler as GET, handler as POST, handler as DELETE };
