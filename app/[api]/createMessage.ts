import { client } from "../lib/openai";

export async function POST(req: Request) {
	try {
		const { messages } = await req.json();

		const events = await client.responses.create({
			model: "gpt-5.2",
			input: messages,
			stream: true,
		});

		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const event of events) {
						const data = JSON.stringify({
							event: event.type,
							data: event,
						});
						controller.enqueue(`data: ${data}\n\n`);
					}
					controller.close();
				} catch (error) {
					console.error("Error in streaming loop:", error);
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
			},
		});
	} catch (error) {
		console.error("Error in POST handler:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{ status: 500 },
		);
	}
}
