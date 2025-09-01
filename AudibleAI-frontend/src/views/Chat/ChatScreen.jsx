import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import {
	getDemoSessions,
	getDemoMessages,
	sendDemoMessage,
} from "../../demo/demoApi";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
// import { FaBars } from "react-icons/fa";
import Bars from "../../components/Bars";
import styles from "./ChatScreen.module.css";

const ChatScreen = () => {
	const [sessions, setSessions] = useState([]);
	const [selectedSession, setSelectedSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const sessionListRef = useRef(null);

	useEffect(() => {
		getDemoSessions().then(setSessions);
	}, []);

	useEffect(() => {
		if (selectedSession) {
			getDemoMessages(selectedSession).then(setMessages);
		}
	}, [selectedSession]);

	// Memoize session buttons
	const handleSessionSelect = useCallback((sessionId) => {
		setSelectedSession(sessionId);
		setInput("");
		setIsTyping(false);
		setSidebarOpen(false);
	}, []);

	const sessionButtons = useMemo(
		() =>
			sessions.map((s) => (
				<button
					key={s.id}
					className={
						selectedSession === s.id
							? styles.activeSession
							: styles.sessionBtn
					}
					onClick={() => handleSessionSelect(s.id)}
				>
					{s.title}
				</button>
			)),
		[sessions, selectedSession, handleSessionSelect]
	);

	// Memoize message bubbles
	const messageBubbles = useMemo(
		() =>
			messages.map((msg) => <MessageBubble key={msg.id} message={msg} />),
		[messages]
	);

	// Memoize handleSend
	const handleSend = useCallback(async () => {
		if (!input.trim() || !selectedSession) return;
		setIsTyping(true);
		const { userMsg, aiMsg } = await sendDemoMessage(
			selectedSession,
			input
		);
		setMessages((msgs) => [...msgs, userMsg]);
		setInput("");
		setTimeout(() => {
			setMessages((msgs) => [...msgs, aiMsg]);
			setIsTyping(false);
		}, 900); // Simulate AI typing delay
	}, [input, selectedSession]);

	// Close sidebar when clicking outside
	useEffect(() => {
		if (!sidebarOpen) return;
		const handleClick = (e) => {
			if (
				sessionListRef.current &&
				!sessionListRef.current.contains(e.target) &&
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
				ref={sessionListRef}
				className={
					styles.sessionList + (sidebarOpen ? " " + styles.open : "")
				}
			>
				{sessionButtons}
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
				{selectedSession && (
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
				)}
			</div>
		</div>
	);
};

export default ChatScreen;
