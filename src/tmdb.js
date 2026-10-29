export { searchTMDB, getTMDBfeed, getTMDBgenres }
import { ResponseError, ResponseSuccess } from "./responses"

const searchMovieEndpoint 	= "https://api.themoviedb.org/3/search/movie"
const searchShowEndpoint 		= "https://api.themoviedb.org/3/search/tv"
const popularMovieEndpoint 	= "https://api.themoviedb.org/3/movie/popular"
const popularShowEndpoint 	= "https://api.themoviedb.org/3/tv/popular"
const tvGenres 							= "https://api.themoviedb.org/3/genre/tv/list?language=en"
const movieGenres 					= "https://api.themoviedb.org/3/genre/movie/list?language=en"

let token = null;

function populateGenres(genres, data) {
	const genreMap = new Map(
		genres.map(genre => [genre.id, genre.name])
	);

	data.results.forEach(e => {
		e.genres = e.genre_ids
			.map(id => genreMap.get(id))
			.filter(name => name !== undefined);

		delete e.genre_ids;
  });

  return data;
}

async function getRequest(endpoint) {
	return fetch(endpoint, {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
			"accept": "application/json"
		}
	})
}

async function searchTMDB(env, genres, type, query, adult, page) {
	// Validate type -> "movie" or "show"
	if (!type || typeof type !== "string" || (type !== "movie" && type !== "show"))
		return ResponseError(400, "Invalid search type");

	// Validate search query
	if (!query || typeof query !== "string" || query.length === 0)
		return ResponseError(400, "Invalid search query");

	// Parse page number, if invalid or not present retrieve first page
	let pageNumber = 1;
	if (typeof page === "number" && Number.isInteger(page) && page >= 1)
		pageNumber = page;

	// Should search include adult content
	let includeAdult = false
	if (typeof adult === "boolean" && adult === true)
		includeAdult = true;


	token = env.tmdbToken;

	let queryEndpoint;
	if (type === "movie") queryEndpoint = searchMovieEndpoint;
	if (type === "show")  queryEndpoint = searchShowEndpoint;

	queryEndpoint = queryEndpoint + `?query=${encodeURIComponent(query)}&include_adult=${includeAdult}&language=en-US&page=${pageNumber}`

	try {
		const response = await getRequest(queryEndpoint);
		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[searchTMDB] Got non 200 code, msg: ${msg}`)
			return ResponseError(response.status, "API Error")
		}

		let data = await response.json();
		if (type === "movie") data = populateGenres(genres.movies, data)
		else data = populateGenres(genres.tv, data)

		return ResponseSuccess(data)
	} catch (e) {
		console.log(`[searchTMDB] Exception: ${e.message}`)
		return ResponseError(500, "Server Error")
	}
}

async function getTMDBfeed(env, genres, type, page) {
	if (typeof type !== "string" || (type !== "show" && type !== "movie"))
		return ResponseError(400, "Invalid type")

	let pageNumber = 1;
	if (typeof page === "number" && Number.isInteger(page) && page >= 1)
		pageNumber = page;

	let queryEndpoint;
	if (type === "movie") queryEndpoint = popularMovieEndpoint;
	if (type === "show") queryEndpoint = popularShowEndpoint;
	queryEndpoint = queryEndpoint + `?language=en-US&page=${pageNumber}`

	token = env.tmdbToken;
	try {
		const response = await getRequest(queryEndpoint);
		if (response.status !== 200) {
			const msg = await response.text();
			console.log(`[getFeed] Non 200 response code, msg: ${msg}`)

			return ResponseError(response.status, "API Error");
		}

		let data = await response.json();
		if (type === "movie") data = populateGenres(genres.movies, data)
		else data = populateGenres(genres.tv, data)

		return ResponseSuccess(data);
	} catch (e) {
		console.log(`[getFeed] Exception: ${e.message}`)
		return ResponseError(500, "Server Error")
	}
}

async function getTMDBgenres(env) {
	token = env.tmdbToken;
	try {
		const mg = await getRequest(movieGenres);
		const tg = await getRequest(tvGenres);

		if (!mg.ok || !tg.ok) {
			const msg_m = await mg.text();
			const msg_t = await tg.text();

			console.log("Responses not ok:");
			console.log(`Movies, code: ${mg.status}, msg: ${msg_m}`)
			console.log(`Shows, code: ${tg.status}, msg: ${msg_t}`)

			return null
		}

		const data_movies = await mg.json();
		const data_tv 		= await tg.json();

		data_movies.movies = data_movies.genres;
		data_tv.movies 		 = data_tv.genres;

		const movies = data_movies.genres;
		const tv 		 = data_tv.genres;
		return {
			movies,
			tv
		}
	} catch (e) {
		console.log("[getGenres] Failed to get genres")
		return null
	}
}
