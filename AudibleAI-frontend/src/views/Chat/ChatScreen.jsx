import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
	getSessions,
	getMessages,
	sendMessage,
	createSession,
} from "../../api/chat";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import styles from "./ChatScreen.module.css";

const ChatScreen = ({ jwt }) => {
	const [sessions, setSessions] = useState([]);
	const [selectedSession, setSelectedSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const sideBarRef = useRef(null);

	useEffect(() => {
		if (!jwt) return;
		getSessions(jwt)
			.then(setSessions)
			.catch(() => setSessions([]));
	}, [jwt]);

	useEffect(() => {
		if (selectedSession && jwt) {
			getMessages(selectedSession, jwt)
				.then(setMessages)
				.catch(() => setMessages([]));
		}
	}, [selectedSession, jwt]);

	const handleSessionSelect = useCallback((sessionId) => {
		setSelectedSession(sessionId);
		setInput("");
		setIsTyping(false);
		setSidebarOpen(false);
	}, []);

	const handleNewChat = useCallback(() => {
		setSelectedSession(null);
		setMessages([]);
		setInput("");
		setIsTyping(false);
		setSidebarOpen(false);
	}, []);

	const sessionButtons = useMemo(
		() =>
			sessions.map((s) => (
				<div
					key={s.id}
					className={
						selectedSession === s.id
							? styles.activeSession
							: styles.sessionBtn
					}
					onClick={() => handleSessionSelect(s.id)}
				>
					{s.title}
				</div>
			)),
		[sessions, selectedSession, handleSessionSelect]
	);

	const messageBubbles = useMemo(
		() =>
			messages.map((msg) => <MessageBubble key={msg.id} message={msg} />),
		[messages]
	);

	const handleSend = useCallback(async () => {
		if (!input.trim() || !jwt) return;
		setIsTyping(true);
		// If starting a new chat
		if (!selectedSession && messages.length === 0) {
			try {
				const res = await createSession(jwt, "New Chat");
				const newSessionId = res.session_id;
				setSelectedSession(newSessionId);
				setSessions((prev) => [
					...prev,
					{ id: newSessionId, title: "New Chat" },
				]);
				await sendMessage(newSessionId, input, jwt);
				setMessages([{ id: Date.now(), sender: "USER", text: input }]);
				setInput("");
				// AI response will be handled via socket streaming in next step
			} catch (err) {
				setIsTyping(false);
			}
			return;
		}
		// ...existing code for sending message...
		if (!selectedSession) return;
		await sendMessage(selectedSession, input, jwt);
		setMessages((msgs) => [
			...msgs,
			{ id: Date.now(), sender: "USER", text: input },
		]);
		setInput("");
		// AI response will be handled via socket streaming in next step
	}, [input, selectedSession, messages.length, jwt]);

	useEffect(() => {
		if (!sidebarOpen) return;
		const handleClick = (e) => {
			if (
				sideBarRef.current &&
				!sideBarRef.current.contains(e.target) &&
				!e.target.classList.contains(styles.breadcrumbBtn)
			) {
				setSidebarOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [sidebarOpen]);

	return (
		<div className={styles.chatScreenContainer}>
			<div
				ref={sideBarRef}
				className={
					styles.sideBar + (sidebarOpen ? " " + styles.open : "")
				}
			>
				<div className={styles.newChatBtn} onClick={handleNewChat}>
					<i className="ri-chat-new-line"></i>
					<p>New Chat</p>
				</div>
				<div className={styles.sessionsList}>
					<div className={styles.sessionsHead}>
						<p>Chats</p>
					</div>
					{sessionButtons}
				</div>
				<button
					className={`${styles.breadcrumbBtn} center`}
					onClick={() => setSidebarOpen(!sidebarOpen)}
				>
					<i className="ri-side-bar-line"></i>
				</button>
			</div>
			<div className={styles.chatArea}>
				<div className={styles.messagesContainer}>
					{messageBubbles}
					{isTyping && <TypingIndicator />}
				</div>
				<div className={styles.inputArea}>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type your message..."
						onKeyDown={(e) => e.key === "Enter" && handleSend()}
					/>
					<button onClick={handleSend}>Send</button>
				</div>
			</div>
		</div>
	);
};

export default ChatScreen;
