import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import {
	getSessions,
	getMessages,
	sendMessage,
	createSession,
} from "../../api/chat";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import styles from "./ChatScreen.module.css";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ChatScreen = ({ jwt }) => {
	const [sessions, setSessions] = useState([]);
	const [selectedSession, setSelectedSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const sideBarRef = useRef(null);
	const socketRef = useRef(null);
	const aiStreamingRef = useRef("");
	const [aiStreamingText, setAiStreamingText] = useState("");
	// Socket connection setup
	useEffect(() => {
		if (!jwt) return;
		if (!socketRef.current) {
			socketRef.current = io(SOCKET_URL, {
				auth: { token: jwt },
				transports: ["websocket"],
			});
			// Emit join event with user_id (from JWT)
			try {
				const payload = JSON.parse(atob(jwt.split(".")[1]));
				const user_id = payload.user_id || payload.sub || payload.id;
				if (user_id) {
					socketRef.current.emit("join", { user_id });
				}
			} catch {}
		}
		const socket = socketRef.current;

		// Listen for AI response chunks
		socket.on("ai:response:chunk", (data) => {
			if (data.session_id !== selectedSession) return;
			setIsTyping(true);
			aiStreamingRef.current += data.chunk;
			setAiStreamingText(aiStreamingRef.current);
			// Show partial AI message
			setMessages((msgs) => {
				// If last message is AI and streaming, update it
				if (
					msgs.length &&
					msgs[msgs.length - 1].sender === "AI" &&
					msgs[msgs.length - 1].streaming
				) {
					const updated = [...msgs];
					updated[updated.length - 1].text = aiStreamingRef.current;
					return updated;
				}
				// Otherwise, add new streaming AI message
				return [
					...msgs,
					{
						id: Date.now(),
						sender: "AI",
						text: aiStreamingRef.current,
						streaming: true,
					},
				];
			});
		});

		// Listen for AI response end
		socket.on("ai:response:end", (data) => {
			if (data.session_id !== selectedSession) return;
			setIsTyping(false);
			aiStreamingRef.current = "";
			setAiStreamingText("");
			setMessages((msgs) => {
				// Replace last streaming AI message with final
				if (
					msgs.length &&
					msgs[msgs.length - 1].sender === "AI" &&
					msgs[msgs.length - 1].streaming
				) {
					const updated = [...msgs];
					updated[updated.length - 1] = {
						...data.message,
						streaming: false,
					};
					return updated;
				}
				// Otherwise, add final AI message
				return [...msgs, { ...data.message, streaming: false }];
			});
		});

		return () => {
			socket.off("ai:response:chunk");
			socket.off("ai:response:end");
		};
	}, [jwt, selectedSession]);

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
			messages.map((msg, idx) => {
				// If last message is AI and streaming, use aiStreamingText
				if (
					msg.sender === "AI" &&
					msg.streaming &&
					idx === messages.length - 1
				) {
					return (
						<MessageBubble
							key={msg.id}
							message={{ ...msg, text: aiStreamingText }}
						/>
					);
				}
				return <MessageBubble key={msg.id} message={msg} />;
			}),
		[messages, aiStreamingText]
	);

	const handleSend = useCallback(async () => {
		if (!input.trim() || !jwt) return;
		setIsTyping(true);
		let sessionId = selectedSession;
		// If starting a new chat
		if (!selectedSession && messages.length === 0) {
			try {
				const res = await createSession(jwt, "New Chat");
				sessionId = res.session_id;
				setSelectedSession(sessionId);
				setSessions((prev) => [
					...prev,
					{ id: sessionId, title: "New Chat" },
				]);
				await sendMessage(sessionId, input, jwt);
				setMessages([{ id: Date.now(), sender: "USER", text: input }]);
				setInput("");
			} catch (err) {
				setIsTyping(false);
			}
		} else if (selectedSession) {
			await sendMessage(sessionId, input, jwt);
			setMessages((msgs) => [
				...msgs,
				{ id: Date.now(), sender: "USER", text: input },
			]);
			setInput("");
		}
	}, [input, selectedSession, messages.length, jwt, isTyping]);

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
