import { ResponseError } from "./responses.js";
import { searchGames, getGamesFeed } from "./igdb.js"
import { getTMDBfeed, searchTMDB, getTMDBgenres } from "./tmdb.js";

const TMDB_GENRE_TTL = 24 * 3600 * 1000; // 24H in MS
let cachedTMDBgenres = null;
let lastCached       = 0;

export default {
	async fetch(request, env, _ctx) {
		const { pathname } = new URL(request.url);
		const now 				 = Date.now();

		// Not cached or expired
		if (cachedTMDBgenres === null || now - lastCached >= TMDB_GENRE_TTL) {
			try { cachedTMDBgenres = await getTMDBgenres(env); lastCached = now } catch (_e) {}
		}

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
				return await searchTMDB(env, cachedTMDBgenres,body.type, body.query, body.adult, body.page)
			else
				return await getTMDBfeed(env, cachedTMDBgenres, body.type, body.page)
		}

		return ResponseError(404, "Not Found");
	},
};
