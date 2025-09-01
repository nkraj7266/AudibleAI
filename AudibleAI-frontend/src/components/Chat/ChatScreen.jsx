import React, { useState, useEffect } from "react";
import { getSessions, getMessages, sendMessage } from "../../api/chat";
import { socket } from "../../utils/socket";

const ChatScreen = ({ jwt }) => {
	const [sessions, setSessions] = useState([]);
	const [selectedSession, setSelectedSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");

	useEffect(() => {
		getSessions(jwt).then(setSessions);
		socket.auth = { token: jwt };
		socket.connect();
		socket.on("chat:ai_response", ({ session_id, message }) => {
			if (session_id === selectedSession) {
				setMessages((msgs) => [...msgs, message]);
			}
		});
		return () => socket.disconnect();
	}, [jwt, selectedSession]);

	const handleSessionSelect = (sessionId) => {
		setSelectedSession(sessionId);
		getMessages(sessionId, jwt).then(setMessages);
	};

	const handleSend = async () => {
		if (!input.trim() || !selectedSession) return;
		await sendMessage(selectedSession, input, jwt);
		setMessages((msgs) => [...msgs, { sender: "USER", text: input }]);
		setInput("");
	};

	return (
		<div>
			<div>
				{sessions.map((s) => (
					<button
						key={s.id}
						onClick={() => handleSessionSelect(s.id)}
					>
						{s.title}
					</button>
				))}
			</div>
			<div>
				{messages.map((msg, idx) => (
					<div key={idx}>
						<b>{msg.sender}:</b> {msg.text}
					</div>
				))}
			</div>
			<input value={input} onChange={(e) => setInput(e.target.value)} />
			<button onClick={handleSend}>Send</button>
		</div>
	);
};

export default ChatScreen;
