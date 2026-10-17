import { ResponseError } from "./responses.js";
import { processRequest } from "./igdb.js"

export default {
	async fetch(request, env, _ctx) {
		if (request.method !== "POST") return ResponseError(400, "Bad request");

		const url = new URL(request.url);

		let body;
		try {body = await request.json()} catch(_e) {body = {}}

		if (url.pathname === "/api/igdb") {
			return await processRequest(env, body);
		} else {
			return ResponseError(404, "Not Found");
		}
	},
};
