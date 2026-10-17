import { ResponseError, ResponseSuccess } from "./responses"
export { processRequest }

const gamesEndpoint = "https://api.igdb.com/v4/games"
const baseQuery = "fields name, summary, storyline, rating, game_type, url, platforms.abbreviation, first_release_date, cover.image_id, artworks.image_id, similar_games.name, similar_games.cover.image_id;where version_parent = null & game_type = (0,1,2,4,8,9,10) ";

async function postRequest(env, endpoint, content) {
	return await fetch(
		endpoint,
		{
			method: "POST",
			headers: {
				'Accept': 'application/json',
      	'Client-ID': env.igdbClientID,
       	'Authorization': env.igdbToken,
			},
			body: content
		}
	)
}

async function searchById(env, id) {
	// Invalid ID
	if (!Number.isInteger(id) || id < 0)
		return ResponseError(400, "Bad game ID");

	try {
		const query = baseQuery + `& id=(${id});`
		const response = await postRequest(env, gamesEndpoint, query)

		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[Search by Game ID] Failed! Response got status: ${response.status}. Message: ${msg}`);

			return ResponseError(response.status, "Error");
		}

		const data = await response.json();
		return ResponseSuccess(data);
	} catch (_e) { return ResponseError(500, "Server error") }
}

async function searchByName(env, name) {
	// No name provided
	if (typeof name !== "string")
		return ResponseError(400, "Invalid game name");

	const gameName = String(name).trim().replace(/['"\\/]/g, "");
	if (gameName.length === 0)
		return ResponseError(400, "No game name provided")

	try {
		const query = `search "${gameName}";` + baseQuery + `;limit 50;`
		const response = await postRequest(env, gamesEndpoint, query)

		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[Search by name] Failed! Response got status: ${response.status}. Message: ${msg}`);

			return ResponseError(response.status, "Error");
		}

		const data = await response.json();
		return ResponseSuccess(data);
	} catch (_e) { return ResponseError(500, "Server error") }
}

async function getRandomGames(env) {
	try {
		const MAX_OFFSET = 1500;
		const query = baseQuery + `;limit 50; offset ${Math.floor(Math.random() * MAX_OFFSET)};`
		const games = await postRequest(env, gamesEndpoint, query);
		if (games.status !== 200) {
			const msg = await idsResponse.text();
			console.log(`[getRandomGames] Failed! Code: ${idsResponse.status}, msg: ${msg}`);

			return ResponseError(500, "Server Error");
		}

		const data = await games.json();
		return ResponseSuccess(data);
	} catch(_e) { return ResponseError(500, "Server Error") }
}

async function processRequest(env, body) {
	if (!body) return ResponseError(400, "Bad request");

	const operation = body.operation;
	if (typeof operation !== "string") return ResponseError(400, "Bad request");

	if (operation === "search") {
		if (body.id)
			return await searchById(env, body.id);
		else
			return await searchByName(env, body.name);
	} else if (operation === "feed") {
		return await getRandomGames(env);
	} else {
		return ResponseError(400, "Bad request");
	}
}
