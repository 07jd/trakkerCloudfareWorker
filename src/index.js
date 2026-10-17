import { ResponseError } from "./responses.js";
import { processRequest } from "./igdb.js"

export default {
	async fetch(request, env, _ctx) {
		if (request.method !== "POST") return ResponseError(400, "Bad request");
		const { pathname } = new URL(request.url);

		let body;
		try {body = await request.json()} catch(_e) {body = {}}

		if (pathname === "/api/igdb") {
			const {success} = await env.igdb_rate_limiter.limit({ key: pathname });
			if (!success) return ResponseError(429, "Rate limited")

			return await processRequest(env, body);
		} else {
			return ResponseError(404, "Not Found");
		}
	},
};
