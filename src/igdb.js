import { ResponseError, ResponseSuccess } from "./responses"
export { searchGames, getGamesFeed }

let clientID 							= null;
let token 								= null;
let pageSize 							= 150;
let popularityType 				= 1;

const gamesEndpoint 			= "https://api.igdb.com/v4/games"
const baseQuery     			= "fields name, summary, storyline, rating, game_type, url, platforms.abbreviation, first_release_date, cover.image_id, artworks.image_id, similar_games.name, similar_games.cover.image_id;where version_parent = null & game_type = (0,1,2,4,8,9,10) ";
const batchQuery    			= "fields name, summary, storyline, rating, game_type, url, platforms.abbreviation, first_release_date, cover.image_id, artworks.image_id, similar_games.name, similar_games.cover.image_id;sort rating desc;";

const popularityEndpoint 	= "https://api.igdb.com/v4/popularity_primitives"
let popularityQuery 		  = "fields game_id,value,popularity_type; sort value desc; limit 150; where popularity_type = "

async function postRequest(endpoint, content) {
	return await fetch(
		endpoint,
		{
			method: "POST",
			headers: {
				"Accept": "application/json",
      	"Client-ID": clientID,
       	"Authorization": `Bearer ${token}`,
			},
			body: content
		}
	)
}

// Search ONE specific game by ID
async function searchById(id) {
	// Invalid ID
	if (!Number.isInteger(id) || id < 0) return ResponseError(400, "Bad game ID");

	try {
		const query = baseQuery + `& id=(${id}); limit 1;`
		const response = await postRequest(gamesEndpoint, query)

		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[Search by Game ID] Failed! Response got status: ${response.status}. Message: ${msg}`);

			return ResponseError(response.status, "Error");
		}

		const data = await response.json();
		return ResponseSuccess(data);
	} catch (_e) { return ResponseError(500, "Server error") }
}

async function searchByName(name, page) {
	// No name provided
	if (typeof name !== "string") return ResponseError(400, "Invalid game name");

	const gameName = String(name).trim().replace(/['"\\/]/g, "");
	if (gameName.length === 0) return ResponseError(400, "No game name provided")

	try {
		const query = `search "${gameName}";` + baseQuery + `;limit ${pageSize};offset ${page};`
		const response = await postRequest(gamesEndpoint, query)

		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[Search by name] Failed! Response got status: ${response.status}. Message: ${msg}`);
			return ResponseError(response.status, "Error");
		}

		const data = await response.json();
		return ResponseSuccess(data);
	} catch (_e) { return ResponseError(500, "Server error") }
}

async function searchGames(env, id, name, page) {
	// No name or ID
	if (!id && !name) return ResponseError(400, "Invalid parameters")

	let pageNumber = 0;
	if (typeof page === "number" && Number.isInteger(page) && page >= 1)
		pageNumber = page - 1;

	// Setup vars
	clientID 				= env.igdbClientID;
	token 					= env.igdbToken;
	popularityType 	= env.igdbPopularityType;
	pageSize 				= env.igdbPageSize;
	popularityType 	= env.igdbPopularityType;
	popularityQuery.replace("150", pageSize);


	if (typeof id === "number" && Number.isInteger(id) && id >= 0)
		return await searchById(id)

	if (typeof name === "string")
		return await searchByName(name, pageNumber)

	return ResponseError(400, "Bad request")
}

async function getGamesFeed(env, page) {
	let pageNumber = 0;
	if (typeof page === "number" && Number.isInteger(page) && page >= 1)
		pageNumber = page - 1;

	// Setup vars
	clientID 				= env.igdbClientID;
	token 					= env.igdbToken;
	popularityType 	= env.igdbPopularityType;
	pageSize 				= env.igdbPageSize;
	popularityType 	= env.igdbPopularityType;
	popularityQuery.replace("150", pageSize);

	try {
		const gamesIDS = await postRequest(popularityEndpoint, `${popularityQuery} ${popularityType}; offset ${pageSize * pageNumber};`)
		if (gamesIDS.status !== 200) {
			const msg = await gamesIDS.text();
			console.log(`[getFeed] Failed, popularityEndpoint! Code: ${gamesIDS.status}, msg: ${msg}`);
			return ResponseError(gamesIDS.status, "API Error");
		}

		const gamesIDSjson = await gamesIDS.json();
		const ids = gamesIDSjson.map(v => v.game_id);
		const idsQuery = `${batchQuery} where id = (${ids.join(",")}); limit ${pageSize};`

		const games = await postRequest(gamesEndpoint, idsQuery)
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
