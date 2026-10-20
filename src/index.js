import { ResponseError } from "./responses.js";
import { processRequest } from "./igdb.js"
import { getFeed, searchTMDB } from "./tmdb.js";

export default {
	async fetch(request, env, _ctx) {
		if (request.method !== "POST") return ResponseError(404, "Not Found");
		const { pathname } = new URL(request.url);

		let body;
		try {body = await request.json()} catch(_e) {body = {}}

		if (pathname === "/api/igdb") {
			const {success} = await env.igdb_rate_limiter.limit({ key: pathname });
			if (!success) return ResponseError(429, "Rate limited")

			return await processRequest(env, body);
		} else if (pathname === "/api/tmdb/search" || pathname === "/api/tmdb/feed") {
			const { success } = await env.tmdb_rate_limiter.limit({ key: pathname });
			if (!success) return ResponseError(429, "Rate limited")

			if (pathname === "/api/tmdb/search")
				return await searchTMDB(env, body.type, body.query, body.adult, body.page)
			else
				return await getFeed(env, body.type, body.page)
		}

		return ResponseError(404, "Not Found");
	},
};
