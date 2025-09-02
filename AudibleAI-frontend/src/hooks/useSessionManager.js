import { useState, useEffect, useCallback } from "react";
import {
	getSessions,
	createSession,
	deleteSession,
	renameSession,
} from "../api/chat.js";

export default function useSessionManager(userId) {
	const [sessions, setSessions] = useState([]);
	const [activeSession, setActiveSession] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!userId) return;
		setLoading(true);
		getSessions(userId)
			.then((sess) => setSessions(sess))
			.catch((err) => setError(err))
			.finally(() => setLoading(false));
	}, [userId]);

	const create = useCallback(
		async (title) => {
			setLoading(true);
			try {
				const session = await createSession(userId, title);
				setSessions((prev) => [...prev, session]);
				setActiveSession(session.id);
				setLoading(false);
				return session;
			} catch (err) {
				setError(err);
				setLoading(false);
				throw err;
			}
		},
		[userId]
	);

	const remove = useCallback(
		async (sessionId) => {
			setLoading(true);
			try {
				await deleteSession(sessionId);
				setSessions((prev) => prev.filter((s) => s.id !== sessionId));
				if (activeSession === sessionId) setActiveSession(null);
				setLoading(false);
			} catch (err) {
				setError(err);
				setLoading(false);
				throw err;
			}
		},
		[activeSession]
	);

	const rename = useCallback(async (sessionId, newTitle) => {
		setLoading(true);
		try {
			const updated = await renameSession(sessionId, newTitle);
			setSessions((prev) =>
				prev.map((s) => (s.id === sessionId ? updated : s))
			);
			setLoading(false);
			return updated;
		} catch (err) {
			setError(err);
			setLoading(false);
			throw err;
		}
	}, []);

	return {
		sessions,
		activeSession,
		setActiveSession,
		createSession: create,
		deleteSession: remove,
		renameSession: rename,
		loading,
		error,
	};
}
