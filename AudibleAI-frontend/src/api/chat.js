export async function getSessions(jwt) {
	const res = await fetch("/sessions", {
		headers: { Authorization: `Bearer ${jwt}` },
	});
	return res.json();
}

export async function getMessages(sessionId, jwt) {
	const res = await fetch(`/sessions/${sessionId}/messages`, {
		headers: { Authorization: `Bearer ${jwt}` },
	});
	return res.json();
}

export async function sendMessage(sessionId, text, jwt) {
	const res = await fetch(`/sessions/${sessionId}/messages`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${jwt}`,
		},
		body: JSON.stringify({ text }),
	});
	return res.json();
}
