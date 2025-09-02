// Utility for decoding JWT and extracting user_id

export function decodeJwt(token) {
	if (!token) return null;
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		return payload;
	} catch {
		return null;
	}
}

export function getJwtUserId(token) {
	const payload = decodeJwt(token);
	if (!payload) return null;
	return payload.user_id || payload.sub || payload.id || null;
}
