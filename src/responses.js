// This is just to avoid repetition in the code
export { ResponseError, ResponseSuccess };

function ResponseError(code, message) {
	return Response.json(
		{error: message},
		{status: code}
	)
}

function ResponseSuccess(message) { return Response.json(message) }
