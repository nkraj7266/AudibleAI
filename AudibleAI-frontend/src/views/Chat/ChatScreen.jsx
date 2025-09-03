import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { getJwtUserId } from "../../utils/jwt";
import {
	getSessions,
	getMessages,
	sendMessage,
	createSession,
} from "../../api/chat";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import styles from "./ChatScreen.module.css";
import { useAudioPlayback } from "../../hooks/useAudioPlayback";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

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
	const messagesEndRef = useRef(null);
	const [aiStreamingText, setAiStreamingText] = useState("");
	// Audio playback hook
	const {
		currentMessageId: playingMessageId,
		isPaused,
		highlightedSentenceIdx,
		startPlayback,
		pausePlayback,
		resumePlayback,
		stopPlayback,
		addAudioChunk,
		finalizeAudio,
		ensureAudioAvailable,
		checkCachedAudio,
	} = useAudioPlayback();
	const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);
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
				const user_id = getJwtUserId(jwt);
				if (user_id) {
					socketRef.current.emit("user:join", { user_id });
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

		// Listen for session title update
		socket.on("session:title:update", (data) => {
			setSessions((prevSessions) =>
				prevSessions.map((s) =>
					s.id === data.session_id ? { ...s, title: data.title } : s
				)
			);
		});

		return () => {
			socket.off("ai:response:chunk");
			socket.off("ai:response:end");
			socket.off("session:title:update");
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

	// Playback handlers

	// Play single message
	const handlePlayMessage = async (msgId) => {
		setIsGlobalPlaying(false);
		const msg = messages.find((m) => m.id === msgId);
		if (!msg) return;

		try {
			// First check if we already have the audio cached
			const hasAudio = await checkCachedAudio(msgId);

			if (hasAudio) {
				// If we have cached audio, play it directly
				await startPlayback(msg.id, msg.text);
			} else {
				// If not cached, request it from the server
				// Socket event handler will cache and play when received
				socketRef.current.emit("tts:start", {
					messageId: msgId,
					text: msg.text,
					userId: getJwtUserId(jwt),
				});
			}
		} catch (error) {
			console.error("Error in message playback:", error);
		}
	};

	// Pause single message
	const handlePauseMessage = (msgId) => {
		const socket = socketRef.current;
		socket.emit("tts:stop", {
			messageId: msgId,
			userId: getJwtUserId(jwt),
		});
		pausePlayback();
	};

	// Global playback state
	const globalPlaybackRef = useRef({ active: false, idx: 0, aiMessages: [] });

	// Play all messages (global)
	const handlePlayAll = () => {
		// If already playing globally, pause
		if (isGlobalPlaying) {
			handleGlobalPause();
			return;
		}
		setIsGlobalPlaying(true);
		// Get all AI messages
		const aiMessages = messages.filter((m) => m.sender === "AI");
		if (aiMessages.length === 0) return;
		globalPlaybackRef.current = { active: true, idx: 0, aiMessages };
		playGlobalMessage(0);
	};

	// Play message at index in global playback
	const playGlobalMessage = async (idx) => {
		const { aiMessages } = globalPlaybackRef.current;
		if (idx >= aiMessages.length) {
			// All done
			setIsGlobalPlaying(false);
			stopPlayback();
			globalPlaybackRef.current.active = false;
			return;
		}

		const msg = aiMessages[idx];
		const userId = getJwtUserId(jwt);

		try {
			// First ensure we have the audio
			const audioReady = await ensureAudioAvailable(
				msg.id,
				msg.text,
				socketRef.current,
				userId
			);

			if (!audioReady) {
				console.error("Failed to ensure audio for message:", msg.id);
				// Skip to next message
				if (globalPlaybackRef.current.active) {
					playGlobalMessage(idx + 1);
				}
				return;
			}

			// Now we know we have the audio in cache, play it
			await startPlayback(msg.id, msg.text, {
				onComplete: () => {
					if (globalPlaybackRef.current.active) {
						playGlobalMessage(idx + 1);
					}
				},
				onError: () => {
					if (globalPlaybackRef.current.active) {
						playGlobalMessage(idx + 1);
					}
				},
			});
		} catch (error) {
			console.error("Error in global playback:", error);
			if (globalPlaybackRef.current.active) {
				playGlobalMessage(idx + 1);
			}
		}
	};

	// Pause global playback
	const handleGlobalPause = () => {
		setIsGlobalPlaying(false);
		globalPlaybackRef.current.active = false;
		// Stop current audio
		stopPlayback();
	};

	// Socket TTS event listeners
	useEffect(() => {
		const socket = socketRef.current;
		if (!socket) return;

		// Audio chunk assembly
		socket.on("tts:audio", async (data) => {
			// Add the chunk for the specific message
			addAudioChunk(data.bytes, data.messageId);
			if (data.isLast) {
				const messageText = messages.find(
					(m) => m.id === data.messageId
				)?.text;
				if (messageText) {
					await finalizeAudio(data.messageId, messageText);
					// After finalizing, try to play the message if it was requested
					if (playingMessageId === data.messageId) {
						await startPlayback(data.messageId, messageText);
					}
				}
			}
		});

		// Playback stopped
		socket.on("tts:stopped", (data) => {
			// If global playback is active, play next message
			if (globalPlaybackRef.current.active && isGlobalPlaying) {
				stopPlayback();
				// Play next message
				globalPlaybackRef.current.idx++;
				playGlobalMessage(globalPlaybackRef.current.idx);
			} else {
				// Not global playback, just stop
				stopPlayback();
			}
		});

		// Playback error
		socket.on("tts:error", () => {
			stopPlayback();
			// Optionally show error toast
		});

		return () => {
			socket.off("tts:audio");
			socket.off("tts:stopped");
			socket.off("tts:error");
		};
	}, [
		playingMessageId,
		jwt,
		isGlobalPlaying,
		messages,
		addAudioChunk,
		finalizeAudio,
		stopPlayback,
	]);
	// Remove the unused highlight logic since we now pass the index directly

	const messageBubbles = useMemo(
		() =>
			messages.map((msg, idx) => {
				const isAI = msg.sender === "AI";
				// If global playback is active, only the current message is playing
				const isPlaying = isGlobalPlaying
					? globalPlaybackRef.current.active &&
					  playingMessageId === msg.id &&
					  !isPaused
					: playingMessageId === msg.id && !isPaused;
				const showPlayback = isAI;
				// If last message is AI and streaming, use aiStreamingText
				if (isAI && msg.streaming && idx === messages.length - 1) {
					return (
						<MessageBubble
							key={msg.id}
							message={{ ...msg, text: aiStreamingText }}
							onPlay={() => handlePlayMessage(msg.id)}
							onPause={() => handlePauseMessage(msg.id)}
							isPlaying={isPlaying}
							highlightedSentenceIdx={
								playingMessageId === msg.id
									? highlightedSentenceIdx
									: null
							}
							showPlayback={showPlayback}
						/>
					);
				}
				return (
					<MessageBubble
						key={msg.id}
						message={msg}
						onPlay={() => handlePlayMessage(msg.id)}
						onPause={() => handlePauseMessage(msg.id)}
						isPlaying={isPlaying}
						highlightedSentenceIdx={
							playingMessageId === msg.id
								? highlightedSentenceIdx
								: null
						}
						showPlayback={showPlayback}
					/>
				);
			}),
		[
			messages,
			aiStreamingText,
			playingMessageId,
			isPaused,
			highlightedSentenceIdx,
			isGlobalPlaying,
		]
	);

	const handleSend = useCallback(async () => {
		if (!input.trim() || !jwt) return;
		setIsTyping(true);
		let sessionId = selectedSession;
		const socket = socketRef.current;
		// If starting a new chat
		if (!selectedSession && messages.length === 0) {
			try {
				const res = await createSession(jwt, "New Chat");
				const sessionId = res.session_id;
				const userMessage = {
					id: Date.now(),
					sender: "USER",
					text: input,
				};

				// Update all state first
				setSessions((prev) => [
					...prev,
					{ id: sessionId, title: "New Chat" },
				]);
				setMessages([userMessage]);
				setInput("");

				// Use the Promise to ensure selectedSession is set before sending the message
				await new Promise((resolve) => {
					setSelectedSession(sessionId);
					// Give React a chance to update the state
					setTimeout(resolve, 0);
				});

				// Now send the message after state is updated
				const user_id = getJwtUserId(jwt);
				socket.emit("user:message", {
					session_id: sessionId,
					user_id,
					text: userMessage.text,
					is_first_message: true,
				});
			} catch (error) {
				console.error("Error creating session:", error);
				setIsTyping(false);
			}
		} else if (selectedSession) {
			// Send user message via socket
			const user_id = getJwtUserId(jwt);
			socket.emit("user:message", {
				session_id: sessionId,
				user_id,
				text: input,
				is_first_message: messages.length === 0,
			});
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

	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

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
			<div className={styles.chatAreaBox}>
				<div className={styles.chatArea}>
					<div className={styles.messagesContainer}>
						{messageBubbles}
						{isTyping && <TypingIndicator />}
						<div ref={messagesEndRef} />
					</div>
					<div className={styles.inputArea}>
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Type your message..."
							onKeyDown={(e) => e.key === "Enter" && handleSend()}
						/>
						{/* Global speaker/pause icon, shown only if there are messages */}
						{messages.filter((m) => m.sender === "AI").length > 0 &&
							(isGlobalPlaying ? (
								<i
									className="ri-pause-fill"
									style={{
										marginRight: 12,
										cursor: "pointer",
										color: "#1565c0",
										fontSize: "1.5em",
									}}
									title="Pause all messages"
									onClick={handleGlobalPause}
								/>
							) : (
								<i
									className="ri-volume-up-fill"
									style={{
										marginRight: 12,
										cursor: "pointer",
										color: "#1565c0",
										fontSize: "1.5em",
									}}
									title="Play all messages"
									onClick={handlePlayAll}
								/>
							))}
						<button onClick={handleSend}>Send</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatScreen;
