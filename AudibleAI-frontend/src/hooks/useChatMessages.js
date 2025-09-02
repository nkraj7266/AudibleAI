import { useState, useEffect, useCallback } from "react";
import { getMessages, sendMessage } from "../api/chat.js";

export default function useChatMessages(sessionId) {
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!sessionId) return;
		setLoading(true);
		getMessages(sessionId)
			.then((msgs) => setMessages(msgs))
			.catch((err) => setError(err))
			.finally(() => setLoading(false));
	}, [sessionId]);

	const addMessage = useCallback((msg) => {
		setMessages((prev) => [...prev, msg]);
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	const send = useCallback(
		async (text, userId) => {
			try {
				setLoading(true);
				const msg = await sendMessage(sessionId, text, userId);
				addMessage(msg);
				setLoading(false);
				return msg;
			} catch (err) {
				setError(err);
				setLoading(false);
				throw err;
			}
		},
		[sessionId, addMessage]
	);

	return { messages, loading, error, addMessage, clearMessages, send };
}
