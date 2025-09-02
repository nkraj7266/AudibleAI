const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function loginUser(email, password) {
	const res = await fetch(`${API_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const data = await res.json();
	return { ok: res.ok, ...data };
}

export async function registerUser(email, password) {
	const res = await fetch(`${API_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const data = await res.json();
	return { ok: res.ok, ...data };
}
