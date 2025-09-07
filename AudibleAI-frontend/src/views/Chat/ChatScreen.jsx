import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { getJwtUserId } from "../../utils/jwt";
import { getSessions, getMessages, createSession } from "../../api/chat";
import { logoutUser } from "../../api/auth";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import styles from "./ChatScreen.module.css";
import { useAudioPlayback } from "../../hooks/useAudioPlayback";
import toast from "react-hot-toast";

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
	const messagesEndRef = useRef(null);
	const [socketConnected, setSocketConnected] = useState(false);
	const lastMessageTextRef = useRef({});

	// Streaming state
	const [streamingMarkdown, setStreamingMarkdown] = useState("");
	const [streamingMessageId, setStreamingMessageId] = useState(null);
	const tempMessageIdRef = useRef(null);

	// Audio playback hook with socket reference
	const {
		currentMessageId,
		currentSentenceIndex,
		isPlaying,
		isPaused,
		isGlobalPlayback,
		addSentenceAudioChunk,
		transferMessageAudio,
		playSingleMessage,
		startGlobalPlayback,
		startPlaybackFromMessage,
		pausePlayback,
		resumePlayback,
		stopGlobalPlayback,
		setMessageTotalSentences,
	} = useAudioPlayback(socketRef.current);

	// Socket connection setup
	useEffect(() => {
		if (!jwt) return;

		if (!socketRef.current) {
			console.log("[Socket] Initializing connection...");
			socketRef.current = io(SOCKET_URL, {
				auth: { token: jwt },
				transports: ["websocket"],
			});

			const socket = socketRef.current;

			socket.on("connect", () => {
				console.log("[Socket] Connected successfully.");
				setSocketConnected(true);
				try {
					const user_id = getJwtUserId(jwt);
					if (user_id) {
						console.log(
							`[Socket] Emitting user:join for user_id: ${user_id}`
						);
						socket.emit("user:join", { user_id });
					}
				} catch (error) {
					console.error("[Socket] Error joining user room:", error);
				}
			});

			socket.on("disconnect", () => {
				console.log("[Socket] Disconnected.");
				setSocketConnected(false);
			});
		}

		return () => {
			if (socketRef.current) {
				console.log("[Socket] Disconnecting...");
				socketRef.current.disconnect();
				socketRef.current = null;
				setSocketConnected(false);
			}
		};
	}, [jwt]);

	// Socket event listeners for new dual-track approach
	useEffect(() => {
		const socket = socketRef.current;
		if (!socket || !socketConnected) return;

		console.log("[Socket] Registering event listeners...");

		// Handle AI response content (Track 1: Full markdown for rendering)
		const handleResponseContent = (data) => {
			console.log("[Socket] Received 'ai:response:content'", data);
			if (data.session_id !== selectedSession) return;

			setIsTyping(false);
			setStreamingMarkdown("");

			// Add the complete AI message to messages
			const newMessage = {
				id: data.message_id,
				sender: "AI",
				text: data.markdown_text,
				total_sentences: data.total_sentences,
			};

			// Store total sentences for audio playback logic
			if (data.total_sentences) {
				console.log(
					`[Audio] Message ${data.message_id} has ${data.total_sentences} total sentences`
				);
				setMessageTotalSentences(data.message_id, data.total_sentences);
			}

			setMessages((prevMessages) => {
				// If the message already exists, do nothing. Otherwise, add it.
				if (prevMessages.some((msg) => msg.id === data.message_id)) {
					console.log(
						`[State] Message ${data.message_id} already exists. Not adding duplicate.`
					);
					return prevMessages;
				}
				console.log(
					`[State] Adding new message ${data.message_id} to state.`
				);
				return [...prevMessages, newMessage];
			});

			setStreamingMessageId(data.message_id);

			// Transfer audio data from temporary ID to real message ID
			if (
				tempMessageIdRef.current &&
				data.message_id !== tempMessageIdRef.current
			) {
				console.log(
					`[Audio] Transferring audio from temp ID ${tempMessageIdRef.current} to final ID ${data.message_id}`
				);
				transferMessageAudio(tempMessageIdRef.current, data.message_id);
			}

			tempMessageIdRef.current = null;
		};

		// Handle sentence highlighting (Track 2: Plain text for coordination)
		const handleSentenceHighlight = (data) => {
			// This event is for visual coordination, logging for now.
			console.log("[Socket] Received 'ai:sentence:highlight'", data);
			if (data.session_id !== selectedSession) return;
			// Store the plain text of the last sentence for potential use
			lastMessageTextRef.current[data.message_id] = data.plain_text;
		};

		// Handle sentence audio chunks
		const handleSentenceAudio = (data) => {
			console.log(
				`[Socket] Received 'ai:sentence:audio' for sentence ${data.sentence_index}, is_last: ${data.is_last}`
			);
			if (data.session_id !== selectedSession) return;

			// Use the final message ID if available, otherwise use temporary ID
			let messageId = streamingMessageId || tempMessageIdRef.current;

			if (!messageId) {
				// Create temporary ID if we don't have one yet
				messageId = `temp_${Date.now()}`;
				tempMessageIdRef.current = messageId;
				console.log(
					`[State] Created temporary message ID: ${messageId}`
				);
			}

			// Add audio chunk for the specific sentence
			addSentenceAudioChunk(
				messageId,
				data.sentence_index,
				data.bytes,
				data.is_last
			);
		};

		// Handle response completion
		const handleResponseComplete = (data) => {
			console.log("[Socket] Received 'ai:response:complete'", data);
			if (data.session_id !== selectedSession) return;

			// Final cleanup for streaming state
			setIsTyping(false);
			setStreamingMarkdown("");
			setStreamingMessageId(data.message_id);

			// Auto-start playback for new messages if global playback is on
			if (data.message_id && isGlobalPlayback) {
				console.log(
					`[Playback] Global playback is active, continuing with new message: ${data.message_id}`
				);
				// The playNextMessageInGlobalQueue will handle playing this message
			}
		};

		// Handle session title updates
		const handleSessionTitleUpdate = (data) => {
			console.log("[Socket] Received 'session:title:update'", data);
			setSessions((prevSessions) =>
				prevSessions.map((s) =>
					s.id === data.session_id ? { ...s, title: data.title } : s
				)
			);
		};

		// Handle errors
		const handleResponseError = (data) => {
			console.error("[Socket] Received 'ai:response:error'", data);
			if (data.session_id !== selectedSession) return;
			setIsTyping(false);
			setStreamingMarkdown("");
			toast.error(`AI Error: ${data.error}`);
		};

		// Register event listeners with new event names
		socket.on("ai:response:content", handleResponseContent);
		socket.on("ai:sentence:highlight", handleSentenceHighlight);
		socket.on("ai:sentence:audio", handleSentenceAudio);
		socket.on("ai:response:complete", handleResponseComplete);
		socket.on("session:title:update", handleSessionTitleUpdate);
		socket.on("ai:response:error", handleResponseError);

		return () => {
			console.log("[Socket] Unregistering event listeners...");
			socket.off("ai:response:content", handleResponseContent);
			socket.off("ai:sentence:highlight", handleSentenceHighlight);
			socket.off("ai:sentence:audio", handleSentenceAudio);
			socket.off("ai:response:complete", handleResponseComplete);
			socket.off("session:title:update", handleSessionTitleUpdate);
			socket.off("ai:response:error", handleResponseError);
		};
	}, [
		socketConnected,
		selectedSession,
		streamingMessageId,
		messages,
		isGlobalPlayback,
		addSentenceAudioChunk,
		transferMessageAudio,
		playSingleMessage,
		startPlaybackFromMessage,
		streamingMarkdown,
		setMessageTotalSentences, // Added dependency
	]);

	useEffect(() => {
		if (!jwt) return;
		console.log("[API] Fetching sessions...");
		getSessions(jwt)
			.then((data) => {
				console.log("[API] Sessions fetched successfully:", data);
				setSessions(data);
			})
			.catch((err) => {
				console.error("[API] Failed to fetch sessions:", err);
				setSessions([]);
			});
	}, [jwt]);

	useEffect(() => {
		if (selectedSession && jwt) {
			console.log(
				`[API] Fetching messages for session: ${selectedSession}`
			);
			getMessages(selectedSession, jwt)
				.then((data) => {
					console.log(
						`[API] Messages fetched successfully for session ${selectedSession}:`,
						data
					);
					setMessages(data);
				})
				.catch((err) => {
					console.error(
						`[API] Failed to fetch messages for session ${selectedSession}:`,
						err
					);
					setMessages([]);
				});
		}
	}, [selectedSession, jwt]);

	const handleSessionSelect = useCallback(
		(sessionId) => {
			console.log(`[State] Selecting session: ${sessionId}`);
			// Stop any ongoing playback
			stopGlobalPlayback();
			setSelectedSession(sessionId);
			setInput("");
			setIsTyping(false);
			setSidebarOpen(false);
			setStreamingMarkdown("");
			setStreamingMessageId(null);
			tempMessageIdRef.current = null;
		},
		[stopGlobalPlayback]
	);

	const handleNewChat = useCallback(() => {
		console.log("[State] Starting new chat.");
		// Stop any ongoing playback
		stopGlobalPlayback();
		setSelectedSession(null);
		setMessages([]);
		setInput("");
		setIsTyping(false);
		setSidebarOpen(false);
		setStreamingMarkdown("");
		setStreamingMessageId(null);
		tempMessageIdRef.current = null;
	}, [stopGlobalPlayback]);

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

	// Playback handlers for global and individual message playback
	const handleGlobalPlayback = useCallback(() => {
		const aiMessages = messages.filter((m) => m.sender === "AI");
		if (aiMessages.length === 0) {
			console.log("[Playback] No AI messages to play globally.");
			return;
		}

		if (isGlobalPlayback) {
			console.log("[Playback] Stopping global playback.");
			stopGlobalPlayback();
		} else {
			console.log("[Playback] Starting global playback from beginning.");
			startGlobalPlayback(aiMessages, selectedSession);
		}
	}, [
		messages,
		isGlobalPlayback,
		startGlobalPlayback,
		stopGlobalPlayback,
		selectedSession,
	]);

	const handleMessagePlayback = useCallback(
		(messageId) => {
			const aiMessages = messages.filter((m) => m.sender === "AI");
			const targetMessage = aiMessages.find((m) => m.id === messageId);

			if (!targetMessage) {
				console.warn(
					`[Playback] Could not find message ${messageId} to play.`
				);
				return;
			}

			if (currentMessageId === messageId) {
				// This message is currently the active one
				if (isPlaying && !isPaused) {
					console.log(`[Playback] Pausing message: ${messageId}`);
					pausePlayback();
				} else {
					console.log(`[Playback] Resuming message: ${messageId}`);
					resumePlayback();
				}
			} else {
				// Start playback from this specific message
				console.log(
					`[Playback] Starting single playback for message: ${messageId}`
				);
				playSingleMessage(
					messageId,
					selectedSession,
					targetMessage.text
				);
			}
		},
		[
			messages,
			currentMessageId,
			isPlaying,
			isPaused,
			resumePlayback,
			pausePlayback,
			playSingleMessage,
			selectedSession,
		]
	);

	const messageBubbles = useMemo(() => {
		return messages.map((msg) => {
			const isAI = msg.sender === "AI";
			const msgIsPlaying = currentMessageId === msg.id && isPlaying;
			const showPlayback = isAI && !msg.streaming;

			return (
				<MessageBubble
					key={msg.id}
					message={msg}
					onPlay={() => handleMessagePlayback(msg.id)}
					isPlaying={msgIsPlaying}
					highlightedSentenceIdx={
						currentMessageId === msg.id
							? currentSentenceIndex
							: null
					}
					showPlayback={showPlayback}
				/>
			);
		});
	}, [
		messages,
		currentMessageId,
		isPlaying,
		currentSentenceIndex,
		handleMessagePlayback,
	]);

	const handleSend = useCallback(async () => {
		if (!input.trim() || !jwt || !socketConnected) {
			console.warn(
				"[Send] Aborted: No input, JWT, or socket connection."
			);
			return;
		}

		const socket = socketRef.current;
		const user_id = getJwtUserId(jwt);

		console.log("[Send] Stopping global playback before sending.");
		stopGlobalPlayback();

		// Clear any streaming state
		setIsTyping(false);
		setStreamingMarkdown("");
		setStreamingMessageId(null);

		// If starting a new chat
		if (!selectedSession && messages.length === 0) {
			console.log("[Send] Creating new session...");
			try {
				const res = await createSession(jwt, "New Chat");
				const sessionId = res.session_id;
				const userMessage = {
					id: `user_${Date.now()}`,
					sender: "USER",
					text: input,
				};
				console.log(`[Send] New session created: ${sessionId}`);

				// Update all state in the correct order
				await new Promise((resolve) => {
					setSelectedSession(sessionId);
					setSessions((prev) => [
						...prev,
						{ id: sessionId, title: "New Chat" },
					]);
					setMessages([userMessage]);
					setInput("");
					setTimeout(resolve, 0);
				});

				setIsTyping(true);

				console.log(
					`[Socket] Emitting 'user:message' for new session.`
				);
				socket.emit("user:message", {
					session_id: sessionId,
					user_id,
					text: userMessage.text,
					is_first_message: true,
				});
			} catch (error) {
				console.error("[Send] Error creating session:", error);
				setIsTyping(false);
				toast.error("Failed to create new session");
			}
		} else if (selectedSession) {
			console.log(
				`[Send] Sending message to existing session: ${selectedSession}`
			);
			const userMessage = {
				id: `user_${Date.now()}`,
				sender: "USER",
				text: input,
			};

			setMessages((msgs) => [...msgs, userMessage]);
			setInput("");
			setIsTyping(true);

			console.log(
				`[Socket] Emitting 'user:message' for existing session.`
			);
			socket.emit("user:message", {
				session_id: selectedSession,
				user_id,
				text: userMessage.text,
				is_first_message: messages.length === 0,
			});
		}
	}, [
		input,
		selectedSession,
		messages.length,
		jwt,
		socketConnected,
		stopGlobalPlayback,
	]);

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
					<button
						className={styles.logoutBtn}
						onClick={async () => {
							console.log("[Auth] Logging out...");
							stopGlobalPlayback();

							try {
								await logoutUser(jwt);
								console.log("[Auth] Logout successful.");
								window.location.href = "/login";
							} catch (error) {
								console.error(
									"[Auth] Error during logout:",
									error
								);
								window.location.href = "/login";
							}
						}}
					>
						<i className="ri-logout-box-line"></i>
						<span>Logout</span>
					</button>
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
						{messages.length === 0 && !isTyping && (
							<div className={styles.greetingContainer}>
								<h1 className={styles.greetingTitle}>
									Hi, Let's Chat
								</h1>
								<p className={styles.greetingSubtitle}>
									Send a message to start the conversation
								</p>
							</div>
						)}
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
							disabled={!socketConnected}
						/>
						{/* Global playback control */}
						{messages.filter((m) => m.sender === "AI").length >
							0 && (
							<i
								className={
									isGlobalPlayback
										? "ri-pause-circle-fill"
										: "ri-play-circle-fill"
								}
								style={{
									marginRight: 12,
									cursor: "pointer",
									color: isGlobalPlayback
										? "#d32f2f"
										: "#1565c0",
									fontSize: "1.8em",
								}}
								title={
									isGlobalPlayback
										? "Stop global playback"
										: "Start global playback"
								}
								onClick={handleGlobalPlayback}
							/>
						)}
						<button
							onClick={handleSend}
							disabled={!socketConnected}
						>
							Send
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatScreen;
