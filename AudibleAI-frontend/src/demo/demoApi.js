// demoApi.js
import { demoSessions } from "./demoSessions";
import { demoMessages } from "./demoMessages";

export function getDemoSessions() {
	return Promise.resolve(demoSessions);
}

export function getDemoMessages(sessionId) {
	return Promise.resolve(demoMessages[sessionId] || []);
}

export function sendDemoMessage(sessionId, text) {
	// Mimic AI response
	const userMsg = {
		id: `msg-${Date.now()}`,
		sender: "USER",
		text,
		created_at: new Date().toISOString(),
	};
	const aiMsg = {
		id: `msg-${Date.now() + 1}`,
		sender: "AI",
		text: `AI response to: ${text}`,
		created_at: new Date().toISOString(),
	};
	if (!demoMessages[sessionId]) demoMessages[sessionId] = [];
	demoMessages[sessionId].push(userMsg, aiMsg);
	return Promise.resolve({ userMsg, aiMsg });
}
