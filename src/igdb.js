import { ResponseError, ResponseSuccess } from "./responses"
export { processRequest }

const gamesEndpoint 			= "https://api.igdb.com/v4/games"
const baseQuery     			= "fields name, summary, storyline, rating, game_type, url, platforms.abbreviation, first_release_date, cover.image_id, artworks.image_id, similar_games.name, similar_games.cover.image_id;where version_parent = null & game_type = (0,1,2,4,8,9,10) ";
const batchQuery    			= "fields name, summary, storyline, rating, game_type, url, platforms.abbreviation, first_release_date, cover.image_id, artworks.image_id, similar_games.name, similar_games.cover.image_id;";

const popularityEndpoint 	= "https://api.igdb.com/v4/popularity_primitives"
const popularityQuery 		= "fields game_id,value,popularity_type; sort value desc; limit 150; where popularity_type = "

async function postRequest(env, endpoint, content) {
	return await fetch(
		endpoint,
		{
			method: "POST",
			headers: {
				"Accept": "application/json",
      	"Client-ID": `${env.igdbClientID}`,
       	"Authorization": `Bearer ${env.igdbToken}`,
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

async function getFeed(env) {
	try {
		const gamesIDS = await postRequest(env, popularityEndpoint, `${popularityQuery} ${env.igdbPopularityType};`)
		if (gamesIDS.status !== 200) {
			const msg = await gamesIDS.text();
			console.log(`[getFeed] Failed, popularityEndpoint! Code: ${gamesIDS.status}, msg: ${msg}`);
			return ResponseError(gamesIDS.status, "API Error");
		}

		const gamesIDSjson = await gamesIDS.json();
		const ids = gamesIDSjson.map(v => v.game_id);
		const idsQuery = `${batchQuery} where id = (${ids.join(",")});`

		const games = await postRequest(env, gamesEndpoint, idsQuery)
		if(games.status !== 200) {
			const msg = await games.text();
			console.log(`[getFeed] Failed! Code: ${games.status}, msg: ${msg}`);
			return ResponseError(games.status, "API Error");
		}

		const data = await games.json();
		return ResponseSuccess(data);
	} catch (e) {
		console.log(e);
		return ResponseError(500, "Server Error")
	}
}

async function processRequest(env, body) {
	const operation = body.operation;
	if (typeof operation !== "string") return ResponseError(400, "Bad request");

	if (operation === "search") {
		if (body.id)
			return await searchById(env, body.id);
		else
			return await searchByName(env, body.name);
	} else if (operation === "feed") {
		return await getFeed(env);
	} else {
		return ResponseError(400, "Bad request");
	}
}
