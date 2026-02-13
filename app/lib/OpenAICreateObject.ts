export const createSettings = (input: string) => {
	return {
		model: "gpt-5.2",
		tools: [
			{
				type: "mcp",
				server_label: "threat-detector",
				server_description:
					"Detect the threats present on a webpage and assets the threat level",
				server_url: "localhost:3000",
				require_approval: "never",
			},
		],
		input,
	};
};
