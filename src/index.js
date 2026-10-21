import { ResponseError } from "./responses.js";
import { searchGames, getGamesFeed } from "./igdb.js"
import { getTMDBfeed, searchTMDB, getTMDBgenres } from "./tmdb.js";

export default {
	async fetch(request, env, _ctx) {
		const { pathname } = new URL(request.url);
		if (pathname === "/api/tmdb/genres" && request.method === "GET") return await getTMDBgenres(env)


		if (request.method !== "POST") return ResponseError(404, "Not Found");

		// Parse body
		let body;
		try {body = await request.json()} catch(_e) {body = {}}

		if (pathname === "/api/igdb/search" || pathname === "/api/igdb/feed") {
			const {success} = await env.igdb_rate_limiter.limit({ key: pathname });
			if (!success) return ResponseError(429, "Rate limited")

			// Get feed or search game
			if (pathname === "/api/igdb/feed") return await getGamesFeed(env, body.page);
			else return await searchGames(env, body.id, body.name, body.page)

		} else if (pathname === "/api/tmdb/search" || pathname === "/api/tmdb/feed") {
			const { success } = await env.tmdb_rate_limiter.limit({ key: pathname });
			if (!success) return ResponseError(429, "Rate limited")

			if (pathname === "/api/tmdb/search")
				return await searchTMDB(env, body.type, body.query, body.adult, body.page)
			else
				return await getTMDBfeed(env, body.type, body.page)
		}

		return ResponseError(404, "Not Found");
	},
};
