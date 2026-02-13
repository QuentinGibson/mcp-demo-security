import { createMcpHandler } from "mcp-handler";
import z from "zod";
import assestThreatFromUrl from "../lib/assestThreatFromUrl";

const handler = createMcpHandler(
	(server) => {
		server.registerTool(
			"threat-detector",
			{
				title: "Threat Dectector",
				description:
					"Detect the threats present on a webpage and assets the threat level",
				inputSchema: {
					url: z.string(),
				},
			},
			async ({ url }) => {
				return {
					content: [
						{
							type: "text",
							text: `${await assestThreatFromUrl(url)}`,
						},
					],
				};
			},
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
