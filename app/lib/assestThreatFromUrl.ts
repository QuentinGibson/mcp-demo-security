import * as cheerio from "cheerio";
import fakeThreatEngine from "./fakeThreatEngine";

export default async function assetThreatFromUrl(url: string) {
	let response: Response;
	try {
		response = await fetch(url);
	} catch (err) {
		return `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`;
	}
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("text/html")) {
		return "The url did not return an html file. Please use another url that is an html file.";
	}
	// Get webpage as a text file
	const html = await response.text();

	// Parse text file into HTML using cheerio (Node.js compatible)
	const $ = cheerio.load(html);

	// Fake threat assestment that can replaced with an real api
	return fakeThreatEngine($);
}
