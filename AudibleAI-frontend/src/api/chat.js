const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function getSessions(jwt) {
	const res = await fetch(`${API_URL}/sessions`, {
		headers: { Authorization: `Bearer ${jwt}` },
	});
	if (!res.ok) throw new Error("Failed to fetch sessions");
	return res.json();
}

export async function getMessages(sessionId, jwt) {
	const res = await fetch(`${API_URL}/sessions/${sessionId}/messages`, {
		headers: { Authorization: `Bearer ${jwt}` },
	});
	if (!res.ok) throw new Error("Failed to fetch messages");
	return res.json();
}

export async function sendMessage(sessionId, text, jwt) {
	const res = await fetch(`${API_URL}/sessions/${sessionId}/messages`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${jwt}`,
		},
		body: JSON.stringify({ text }),
	});
	if (!res.ok) throw new Error("Failed to send message");
	return res.json();
}

export async function createSession(jwt, title = "New Chat") {
	const res = await fetch(`${API_URL}/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${jwt}`,
		},
		body: JSON.stringify({ title }),
	});
	if (!res.ok) throw new Error("Failed to create session");
	return res.json();
}

export async function deleteSession(sessionId, jwt) {
	const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${jwt}`,
		},
	});
	if (!res.ok) throw new Error("Failed to delete session");
	return true;
}

export async function renameSession(sessionId, newTitle, jwt) {
	const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${jwt}`,
		},
		body: JSON.stringify({ title: newTitle }),
	});
	if (!res.ok) throw new Error("Failed to rename session");
	return await res.json();
}
