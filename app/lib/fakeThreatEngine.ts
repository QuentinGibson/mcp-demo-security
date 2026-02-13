import type { CheerioAPI } from "cheerio";

// A fake security scan
export default function fakeThreatEngine($: CheerioAPI) {
	// Find and count all 'a' tags
	const links = $("a");
	const linkLength = links.length;

	// Pick random links from the page to use as fake threat examples
	const linkArray = links.map((_, el) => $(el).attr("href") ?? "").get();
	const pick = (i: number) => linkArray[i % linkArray.length] ?? "unknown";

	// Return unsafe if there are more than 10 links otherwise return safe
	return linkLength > 10
		? `--Threat Level: High--
---------------------------------------------------------------------------
| Threat Name       | Threat Type  | Severity | Link Content              |
---------------------------------------------------------------------------
| Phishing Redirect | Malicious URL| Critical | ${pick(0)}
| Data Exfil Beacon | C2 Callback  | High     | ${pick(3)}
| Cred Harvester    | Fake Form    | Critical | ${pick(7)}
| Tracking Pixel    | Surveillance | Medium   | ${pick(5)}
| Drive-by Download | Exploit Kit  | High     | ${pick(9)}
---------------------------------------------------------------------------
Total suspicious links found: ${linkLength}`
		: "No threats detected!";
}
