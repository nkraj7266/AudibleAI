import { useState, useEffect, useRef, useCallback, use } from "react";
import { cacheAudio, getCachedAudio } from "../utils/audioCache";

// Helper function to extract user ID from JWT token
const getUserIdFromToken = (token) => {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		return payload.user_id;
	} catch (e) {
		console.error("[Auth] Failed to decode JWT token:", e);
		return null;
	}
};

/**
 * Enhanced audio playback hook aligned with backend dual-track approach
 * Supports both streaming and on-demand playback with global controls
 */
export const useAudioPlayback = (socket) => {
	// Playback state
	const [currentMessageId, setCurrentMessageId] = useState(null);
	const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [isGlobalPlayback, setIsGlobalPlayback] = useState(false);

	// Audio data storage
	const sentenceAudioChunks = useRef(new Map()); // messageId -> Map(sentenceIndex -> chunks[])
	const sentenceAudioBlobs = useRef(new Map()); // messageId -> Map(sentenceIndex -> audioBlob)
	const sentenceMetadata = useRef(new Map()); // messageId -> Map(sentenceIndex -> { isLast: boolean })
	const currentAudioRef = useRef(null);
	const playNextSentenceRef = useRef(null);

	// Global playback management
	const globalPlaybackQueue = useRef([]); // Array of message IDs to play
	const currentGlobalIndex = useRef(0);
	const pendingPlayback = useRef(null); // { messageId, sentenceIndex }

	useEffect(() => {
		console.log("[Audio] Initializing useAudioPlayback hook.");
		console.log(
			`[Audio] Playback state - isPlaying: ${isPlaying}, isPaused: ${isPaused}, currentMessageId: ${currentMessageId}, currentSentenceIndex: ${currentSentenceIndex}, isGlobalPlayback: ${isGlobalPlayback}`
		);
	}, [isGlobalPlayback]);

	useEffect(() => {
		console.log("[Global] isGlobalPlayback changed:", isGlobalPlayback);
	}, [isGlobalPlayback]);

	/**
	 * Initialize message audio storage
	 */
	const initMessageAudio = useCallback((messageId) => {
		if (!sentenceAudioChunks.current.has(messageId)) {
			console.log(
				`[Audio] Initializing audio storage in memory for message: ${messageId}`
			);
			sentenceAudioChunks.current.set(messageId, new Map());
			sentenceAudioBlobs.current.set(messageId, new Map());
		}
	}, []);

	/**
	 * Finalize sentence audio by creating blob and caching
	 */
	// Keep track of message total sentences count
	const messageTotalSentences = useRef(new Map()); // messageId -> totalSentences

	let ensureMessageAudioAndPlay = null;

	// Function to set the total sentences for a message
	const setMessageTotalSentences = useCallback(
		(messageId, totalSentences) => {
			console.log(
				`[Audio] Setting total sentences for message ${messageId} to ${totalSentences}`
			);
			messageTotalSentences.current.set(messageId, totalSentences);
		},
		[]
	);

	/**
	 * Stop all playback and cleanup
	 */
	const stopPlayback = useCallback(() => {
		if (currentAudioRef.current) {
			console.log(
				`[Audio] Stopping playback for message: ${currentMessageId}`
			);
			// currentAudioRef.current.pause();
			// currentAudioRef.current.src = "";
			// currentAudioRef.current = null;
		}

		if (isPlaying || isPaused || currentMessageId) {
			console.log("[Audio] Resetting playback state.");
			setCurrentMessageId(null);
			setCurrentSentenceIndex(null);
			setIsPlaying(false);
			setIsPaused(false);
			pendingPlayback.current = null;
		}
	}, [isPlaying, isPaused, currentMessageId]);

	const stopGlobalPlayback = useCallback(() => {
		console.log("[Audio] Stopping global playback.");
		stopPlayback();
		setIsGlobalPlayback(false);
		globalPlaybackQueue.current = [];
		currentGlobalIndex.current = 0;
	}, [stopPlayback]);

	const playNextMessageInGlobalQueue = useCallback(async () => {
		if (!isGlobalPlayback) return;

		currentGlobalIndex.current += 1;
		console.log(
			`[Audio] Advancing global queue to index: ${currentGlobalIndex.current}`
		);

		if (currentGlobalIndex.current >= globalPlaybackQueue.current.length) {
			console.log("[Audio] Global playback queue finished.");
			stopGlobalPlayback();
			return;
		}

		const nextMessage =
			globalPlaybackQueue.current[currentGlobalIndex.current];
		console.log(
			`[Audio] Playing next message from global queue: ${nextMessage.id}`
		);
		await ensureMessageAudioAndPlay(
			nextMessage.id,
			nextMessage.sessionId,
			nextMessage.text
		);
	}, [stopGlobalPlayback, ensureMessageAudioAndPlay, isGlobalPlayback]);

	const playNextSentence = useCallback(
		async (messageId, currentSentenceIndex) => {
			// Check if current sentence was the last one
			const metadata = sentenceMetadata.current
				.get(messageId)
				?.get(currentSentenceIndex);

			// Get total sentences for this message
			const totalSentences = messageTotalSentences.current.get(messageId);
			const isLastByCount =
				totalSentences !== undefined &&
				currentSentenceIndex === totalSentences - 1;

			// Use either metadata or count to determine if this is the last sentence
			if (metadata?.isLast || isLastByCount) {
				console.log(
					`[Audio] Current sentence ${currentSentenceIndex} was the last for message: ${messageId}
					is global playback: ${isGlobalPlayback}`
				);
				if (isGlobalPlayback) {
					await playNextMessageInGlobalQueue();
				} else {
					// Just update states without stopping playback
					setCurrentMessageId(null);
					setCurrentSentenceIndex(null);
					setIsPlaying(false);
					setIsPaused(false);
				}
				return;
			}

			const nextSentenceIndex = currentSentenceIndex + 1;
			console.log(
				`[Audio] Looking for next sentence for message: ${messageId}. Current: ${currentSentenceIndex}, Next: ${nextSentenceIndex}`
			);

			const played = await playSentence(messageId, nextSentenceIndex);

			if (!played && !pendingPlayback.current) {
				console.log(
					`[Audio] Playback failed and not pending for sentence ${nextSentenceIndex}. Assuming end of message.`
				);
				if (isGlobalPlayback) {
					await playNextMessageInGlobalQueue();
				} else {
					// Just update states without stopping playback
					setCurrentMessageId(null);
					setCurrentSentenceIndex(null);
					setIsPlaying(false);
					setIsPaused(false);
				}
			}
		},
		[isGlobalPlayback, playNextMessageInGlobalQueue, stopPlayback]
	);

	useEffect(() => {
		playNextSentenceRef.current = playNextSentence;
	}, [playNextSentence]);

	let cnt = 0;
	const playSentence = useCallback(
		async (messageId, sentenceIndex) => {
			console.log(
				`[Audio] Attempting to play sentence: ${sentenceIndex} of message: ${messageId}`
			);
			try {
				let audioBlob = sentenceAudioBlobs.current
					.get(messageId)
					?.get(sentenceIndex);

				if (!audioBlob) {
					const sentenceKey = `${messageId}_sentence_${sentenceIndex}`;
					const cachedData = await getCachedAudio(sentenceKey);
					if (cachedData?.blob) {
						console.log(
							`[Audio] Found in cache, restoring to memory for sentence: ${sentenceIndex}`,
							cachedData.metadata
						);
						initMessageAudio(messageId);

						// Restore audio blob
						sentenceAudioBlobs.current
							.get(messageId)
							.set(sentenceIndex, cachedData.blob);

						audioBlob = cachedData.blob; // Restore audio blob

						// Restore metadata
						if (!sentenceMetadata.current.has(messageId)) {
							sentenceMetadata.current.set(messageId, new Map());
						}
						sentenceMetadata.current
							.get(messageId)
							.set(sentenceIndex, {
								isLast: cachedData.metadata?.isLast,
							});
					}
				}

				if (!audioBlob) {
					console.log(
						`[Audio] No audio found for sentence: ${sentenceIndex}. Playback for this message will stop here unless audio is fetched.`
					);
					pendingPlayback.current = { messageId, sentenceIndex };
					return false;
				}

				const audioUrl = URL.createObjectURL(audioBlob);
				const audio = new Audio(audioUrl);
				currentAudioRef.current = audio;

				audio.onended = () => {
					console.log(
						`[Audio] Finished playing sentence: ${sentenceIndex} of message: ${messageId}`
					);
					playNextSentenceRef.current(messageId, sentenceIndex);
				};

				audio.onerror = () => {
					console.error(
						`[Audio] Playback error for message ${messageId}, sentence ${sentenceIndex}:`,
						audio.error
					);
					stopPlayback();
				};

				await audio.play();
				cnt++;
				console.log(
					`[Audio] Now playing sentence: ${sentenceIndex} of message: ${messageId} (play count: ${cnt})`
				);
				setCurrentMessageId(messageId);
				setCurrentSentenceIndex(sentenceIndex);
				setIsPlaying(true);
				setIsPaused(false);
				return true;
			} catch (error) {
				console.error(
					`[Audio] Error playing sentence ${sentenceIndex} for message ${messageId}:`,
					error
				);
				stopPlayback();
				return false;
			}
		},
		[initMessageAudio, stopPlayback]
	);

	const finalizeSentenceAudio = useCallback(
		async (messageId, sentenceIndex) => {
			console.log(
				`[Audio] Finalizing audio for message: ${messageId}, sentence: ${sentenceIndex}`
			);
			const messageChunks = sentenceAudioChunks.current.get(messageId);
			const chunks = messageChunks?.get(sentenceIndex);

			if (!chunks || chunks.length === 0) {
				console.warn(
					`[Audio] No chunks to finalize for message: ${messageId}, sentence: ${sentenceIndex}`
				);
				return;
			}

			try {
				const audioBlob = new Blob(
					chunks.map((b64) =>
						Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
					),
					{ type: "audio/mp3" }
				);

				// Store in memory
				const messageBlobMap =
					sentenceAudioBlobs.current.get(messageId);
				messageBlobMap.set(sentenceIndex, audioBlob);

				// Check if this is the last sentence based on the total count
				const totalSentences =
					messageTotalSentences.current.get(messageId);
				const isLastSentence =
					totalSentences !== undefined &&
					sentenceIndex === totalSentences - 1;

				// Store metadata
				if (!sentenceMetadata.current.has(messageId)) {
					sentenceMetadata.current.set(messageId, new Map());
				}
				const metadata = sentenceMetadata.current.get(messageId);
				metadata.set(sentenceIndex, { isLast: isLastSentence });

				console.log(
					`[Audio] Stored audio blob and metadata for message: ${messageId}, sentence: ${sentenceIndex}, isLast: ${isLastSentence}`
				);

				// Cache in IndexedDB with metadata
				const sentenceKey = `${messageId}_sentence_${sentenceIndex}`;
				await cacheAudio(sentenceKey, audioBlob, {
					isLast: isLastSentence,
				});
				console.log(
					`[Audio] Cached audio in IndexedDB with key: ${sentenceKey} and metadata:`,
					{ isLast: isLastSentence }
				);

				// Clean up chunks
				messageChunks.delete(sentenceIndex);

				// Check if there's pending playback for this sentence
				if (
					pendingPlayback.current?.messageId === messageId &&
					pendingPlayback.current?.sentenceIndex === sentenceIndex
				) {
					console.log(
						`[Audio] Fulfilling pending playback for message: ${messageId}, sentence: ${sentenceIndex}`
					);
					await playSentence(messageId, sentenceIndex);
					pendingPlayback.current = null;
				}
			} catch (error) {
				console.error(
					`[Audio] Error finalizing sentence ${sentenceIndex} audio for message ${messageId}:`,
					error
				);
			}
		},
		[playSentence]
	);

	/**
	 * Add audio chunk for a specific sentence
	 */
	const addSentenceAudioChunk = useCallback(
		(messageId, sentenceIndex, chunk, isLast) => {
			console.log(
				`[Audio] Received chunk for message: ${messageId}, sentence: ${sentenceIndex}, isLast: ${isLast}`
			);
			initMessageAudio(messageId);

			const messageChunks = sentenceAudioChunks.current.get(messageId);
			if (!messageChunks.has(sentenceIndex)) {
				messageChunks.set(sentenceIndex, []);
			}

			messageChunks.get(sentenceIndex).push(chunk);

			// If this is the last chunk, finalize the sentence audio
			if (isLast) {
				finalizeSentenceAudio(messageId, sentenceIndex);
			}
		},
		[initMessageAudio]
	);

	/**
	 * Transfer audio data from temporary to permanent message ID
	 */
	const transferMessageAudio = useCallback(
		async (fromMessageId, toMessageId) => {
			console.log(
				`[Audio] Transferring audio data from temp ID ${fromMessageId} to permanent ID ${toMessageId}`
			);
			try {
				// Transfer chunks
				const fromChunks =
					sentenceAudioChunks.current.get(fromMessageId);
				if (fromChunks) {
					sentenceAudioChunks.current.set(toMessageId, fromChunks);
					sentenceAudioChunks.current.delete(fromMessageId);
					console.log(
						`[Audio] Transferred ${fromChunks.size} sentence chunks.`
					);
				}

				// Transfer blobs
				const fromBlobs = sentenceAudioBlobs.current.get(fromMessageId);
				if (fromBlobs) {
					sentenceAudioBlobs.current.set(toMessageId, fromBlobs);
					sentenceAudioBlobs.current.delete(fromMessageId);
					console.log(
						`[Audio] Transferred ${fromBlobs.size} sentence blobs.`
					);

					// Update cache keys
					for (const [
						sentenceIndex,
						audioBlob,
					] of fromBlobs.entries()) {
						const oldKey = `${fromMessageId}_sentence_${sentenceIndex}`;
						const newKey = `${toMessageId}_sentence_${sentenceIndex}`;
						await cacheAudio(newKey, audioBlob);
						await deleteCachedAudio(oldKey); // FIX: Delete old cache entry
						console.log(
							`[Audio] Migrated cache key from ${oldKey} to ${newKey}`
						);
					}
				}

				// Update pending playback
				if (pendingPlayback.current?.messageId === fromMessageId) {
					pendingPlayback.current.messageId = toMessageId;
					console.log(
						`[Audio] Updated pending playback to new message ID: ${toMessageId}`
					);
				}

				// Update current playback
				if (currentMessageId === fromMessageId) {
					setCurrentMessageId(toMessageId);
					console.log(
						`[Audio] Updated current playback message ID to: ${toMessageId}`
					);
				}

				// Update global queue if necessary
				const queueIndex = globalPlaybackQueue.current.findIndex(
					(msg) => msg.id === fromMessageId
				);
				if (queueIndex !== -1) {
					globalPlaybackQueue.current[queueIndex].id = toMessageId;
					console.log(
						`[Audio] Updated global playback queue with new message ID: ${toMessageId}`
					);
				}
			} catch (error) {
				console.error(
					`[Audio] Error transferring audio from ${fromMessageId} to ${toMessageId}:`,
					error
				);
			}
		},
		[currentMessageId]
	);

	ensureMessageAudioAndPlay = useCallback(
		async (messageId, sessionId, markdownText) => {
			console.log(
				`[Audio] Ensuring audio is available for message: ${messageId}`
			);
			// Check if first sentence audio is available
			const messageBlobMap = sentenceAudioBlobs.current.get(messageId);
			const hasFirstSentence = messageBlobMap?.has(0);

			if (!hasFirstSentence) {
				console.log(
					`[Audio] First sentence not in memory for message: ${messageId}. Checking cache.`
				);
				// Try to get from cache first
				const sentenceKey = `${messageId}_sentence_0`;
				const cachedAudioData = await getCachedAudio(sentenceKey);
				const cachedAudio = cachedAudioData?.blob;

				if (cachedAudio) {
					console.log(
						`[Audio] Found first sentence in cache for message: ${messageId}. Restoring and playing.`
					);
					// Found in cache, restore to memory
					initMessageAudio(messageId);
					sentenceAudioBlobs.current
						.get(messageId)
						.set(0, cachedAudio);
					await playSentence(messageId, 0);
				} else if (socket && sessionId && markdownText) {
					console.log(
						`[Audio] No audio in cache for message: ${messageId}. Requesting from server.`
					);
					// Request from server
					const userId = socket.auth?.token
						? getUserIdFromToken(socket.auth.token)
						: null;
					if (userId) {
						socket.emit("tts:ai:message", {
							user_id: userId,
							session_id: sessionId,
							message_id: messageId,
							text: markdownText,
						});

						// Set as pending to play when audio arrives
						console.log(
							`[Audio] Set pending playback for message: ${messageId}, sentence: 0`
						);
						pendingPlayback.current = {
							messageId,
							sentenceIndex: 0,
						};
					} else {
						console.error(
							"[Audio] Cannot request TTS, user ID not found in token."
						);
					}
				} else {
					console.warn(
						`[Audio] Cannot ensure audio for message ${messageId}: missing socket, session, or text.`
					);
				}
			} else {
				console.log(
					`[Audio] First sentence already in memory for message: ${messageId}. Playing directly.`
				);
				// Audio available, play directly
				await playSentence(messageId, 0);
			}
		},
		[socket, initMessageAudio, playSentence]
	);

	/**
	 * Start global playback for all AI messages
	 */
	const startGlobalPlayback = useCallback(
		async (aiMessages, sessionId) => {
			if (!aiMessages || aiMessages.length === 0) {
				console.log(
					"[Audio] Attempted to start global playback with no AI messages."
				);
				return;
			}
			console.log(
				`[Audio] Starting global playback for ${aiMessages.length} AI messages.`
			);

			// Stop any current playback
			stopPlayback();

			// Set up global playback state
			globalPlaybackQueue.current = aiMessages.map((msg) => ({
				id: msg.id,
				sessionId: sessionId,
				text: msg.text,
			}));
			currentGlobalIndex.current = 0;
			setIsGlobalPlayback(true);
			console.log(
				"[Audio] Global playback queue:",
				globalPlaybackQueue.current
			);

			// Start with first message
			const firstMessage = aiMessages[0];
			console.log(
				`[Audio] Kicking off global playback with message: ${firstMessage.id}`
			);
			await ensureMessageAudioAndPlay(
				firstMessage.id,
				sessionId,
				firstMessage.text
			);
		},
		[ensureMessageAudioAndPlay, stopPlayback]
	);

	/** Play a single message on demand
	 * Stops any global playback in progress
	 */
	const playSingleMessage = useCallback(
		async (messageId, sessionId, markdownText) => {
			console.log(
				`[Audio] Starting single message playback for: ${messageId}`
			);
			stopGlobalPlayback(); // Stop any global playback
			await ensureMessageAudioAndPlay(messageId, sessionId, markdownText);
		},
		[stopGlobalPlayback, ensureMessageAudioAndPlay]
	);

	/**
	 * Pause current playback
	 */
	const pausePlayback = useCallback(() => {
		if (currentAudioRef.current) {
			console.log(
				`[Audio] Pausing playback for message: ${currentMessageId}`
			);
			currentAudioRef.current.pause();
			setIsPaused(true);
			setIsPlaying(false);
		}
	}, [currentMessageId]);

	/**
	 * Resume current playback
	 */
	const resumePlayback = useCallback(() => {
		if (currentAudioRef.current && isPaused) {
			console.log(
				`[Audio] Resuming playback for message: ${currentMessageId}`
			);
			currentAudioRef.current.play();
			setIsPaused(false);
			setIsPlaying(true);
		}
	}, [isPaused, currentMessageId]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Only cleanup if we're not in the middle of playback
			// This prevents cleanup during state updates
			if (isPlaying && !isPaused && !isGlobalPlayback) {
				console.log(
					"[Audio] Unmounting component, stopping all playback and clearing data."
				);
				stopGlobalPlayback();
				sentenceAudioChunks.current.clear();
				sentenceAudioBlobs.current.clear();
			} else {
				console.log(
					"[Audio] Skipping cleanup due to active playback state."
				);
			}
		};
	}, [stopGlobalPlayback, isPlaying, isPaused]);

	return {
		// State
		currentMessageId,
		currentSentenceIndex,
		isPlaying,
		isPaused,
		isGlobalPlayback,

		// Audio management
		addSentenceAudioChunk,
		transferMessageAudio,
		setMessageTotalSentences,
		// clearMessageAudio,

		// Playback controls
		playSentence,
		playSingleMessage,
		startGlobalPlayback,
		pausePlayback,
		resumePlayback,
		stopPlayback,
		stopGlobalPlayback,

		// Utilities
		ensureMessageAudioAndPlay,
	};
};
