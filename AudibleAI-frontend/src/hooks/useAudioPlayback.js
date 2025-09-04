import { useState, useEffect, useRef } from "react";
import { splitIntoSentences } from "../utils/textSegmentation";
import { cacheAudio, getCachedAudio } from "../utils/audioCache";

/**
 * Hook to manage audio playback and text highlighting
 */
export const useAudioPlayback = () => {
	const audioRef = useRef(null);
	const audioChunksRef = useRef(new Map()); // Map to store chunks per message
	const [currentMessageId, setCurrentMessageId] = useState(null);
	const [isPaused, setIsPaused] = useState(false);
	const [highlightedSentenceIdx, setHighlightedSentenceIdx] = useState(null);
	const sentencesRef = useRef([]);
	const timingsRef = useRef([]);

	// Calculate approximate timings for sentences based on text length
	const calculateSentenceTimings = (sentences, totalDuration) => {
		const totalLength = sentences.reduce(
			(sum, s) => sum + s.text.length,
			0
		);
		return sentences.map((sentence) => {
			const ratio = sentence.text.length / totalLength;
			return ratio * totalDuration;
		});
	};

	// Handle audio time updates
	const handleTimeUpdate = () => {
		if (!audioRef.current || !sentencesRef.current.length) return;

		const currentTime = audioRef.current.currentTime;
		let timeSum = 0;

		// Find current sentence based on timing
		const newSentenceIdx = timingsRef.current.findIndex((timing, idx) => {
			timeSum += timing;
			return currentTime <= timeSum;
		});

		if (
			newSentenceIdx !== -1 &&
			newSentenceIdx !== highlightedSentenceIdx
		) {
			setHighlightedSentenceIdx(newSentenceIdx);
		}
	};

	// Initialize audio playback
	const initializeAudio = async (audio, onComplete) => {
		// Stop any existing playback first
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.removeEventListener(
				"timeupdate",
				handleTimeUpdate
			);
			audioRef.current = null;
		}

		// Create new audio instance
		const url = URL.createObjectURL(audio);
		audioRef.current = new Audio(url);
		audioRef.current.addEventListener("timeupdate", handleTimeUpdate);

		// Set up completion handler
		audioRef.current.onended = () => {
			setCurrentMessageId(null);
			setHighlightedSentenceIdx(null);
			setIsPaused(false);
			if (onComplete) {
				onComplete();
			}
		};

		// Wait for audio to be ready
		return new Promise((resolve, reject) => {
			audioRef.current.oncanplaythrough = () => {
				resolve();
			};
			audioRef.current.onerror = () => {
				reject(new Error("Failed to load audio"));
			};
		});
	};

	// Ensure audio is available (either cached or fetched)
	const ensureAudioAvailable = async (messageId, text, socket, userId) => {
		try {
			// First check cache
			const cachedAudio = await getCachedAudio(messageId);
			if (cachedAudio) {
				return true;
			}

			// If not cached, request from server
			return new Promise((resolve) => {
				let chunks = [];

				const onAudio = (data) => {
					if (data.messageId !== messageId) return;
					chunks.push(data.bytes);
					if (data.isLast) {
						const audioBlob = new Blob(
							chunks.map((b64) =>
								Uint8Array.from(atob(b64), (c) =>
									c.charCodeAt(0)
								)
							),
							{ type: "audio/mp3" }
						);
						cacheAudio(messageId, audioBlob);
						cleanup();
						resolve(true);
					}
				};

				const onError = () => {
					cleanup();
					resolve(false);
				};

				const cleanup = () => {
					socket.off("tts:audio", onAudio);
					socket.off("tts:error", onError);
				};

				socket.on("tts:audio", onAudio);
				socket.on("tts:error", onError);

				// Request TTS
				socket.emit("tts:start", {
					messageId,
					text,
					userId,
				});
			});
		} catch (error) {
			console.error("Error ensuring audio availability:", error);
			return false;
		}
	};

	// Check if audio is cached
	const checkCachedAudio = async (messageId) => {
		try {
			const cached = await getCachedAudio(messageId);
			return Boolean(cached);
		} catch (error) {
			console.warn("Error checking cached audio:", error);
			return false;
		}
	};

	// Start playback with text highlighting
	const startPlayback = async (messageId, text, options = {}) => {
		try {
			// Stop any current playback first
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = ""; // Release previous audio resources
			}

			setCurrentMessageId(messageId);
			setIsPaused(false);
			setHighlightedSentenceIdx(null);

			// Split text into sentences
			const sentences = splitIntoSentences(text);
			sentencesRef.current = sentences;

			// Use cached audio or provided blob
			let audio = options.audioBlob;
			if (!audio) {
				audio = await getCachedAudio(messageId);
			}

			if (audio) {
				try {
					// Initialize and wait for audio to be ready
					const onComplete = () => {
						// First call any provided onComplete callback
						if (options.onComplete) {
							options.onComplete();
						}
						// Then clean up
						if (audioRef.current) {
							audioRef.current.src = "";
						}
						setCurrentMessageId(null);
						setHighlightedSentenceIdx(null);
						setIsPaused(false);
					};

					await initializeAudio(audio, onComplete);

					// Calculate sentence timings
					timingsRef.current = calculateSentenceTimings(
						sentences,
						audioRef.current.duration
					);

					// Start playback
					await audioRef.current.play();
					return true;
				} catch (error) {
					console.error("Audio playback failed:", error);
					if (options.onError) {
						options.onError(error);
					}
					return false;
				}
			}
			return false;
		} catch (error) {
			console.error("Playback error:", error);
			if (options.onError) {
				options.onError(error);
			}
			return false;
		}
	};

	// Pause playback
	const pausePlayback = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			setIsPaused(true);
		}
	};

	// Resume playback
	const resumePlayback = () => {
		if (audioRef.current) {
			audioRef.current.play();
			setIsPaused(false);
		}
	};

	// Stop playback and cleanup
	const stopPlayback = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			audioRef.current.src = ""; // Release audio resources
		}
		setCurrentMessageId(null);
		setHighlightedSentenceIdx(null);
		setIsPaused(false);
	};

	// Add chunk to audio assembly for a specific message
	const addAudioChunk = (chunk, messageId) => {
		if (!messageId) return;
		if (!audioChunksRef.current.has(messageId)) {
			audioChunksRef.current.set(messageId, []);
		}
		audioChunksRef.current.get(messageId).push(chunk);
	};

	// Finalize audio assembly and start playback
	const finalizeAudio = async (messageId, text, options = {}) => {
		if (!messageId || !audioChunksRef.current.has(messageId)) return;
		const chunks = audioChunksRef.current.get(messageId);
		if (chunks.length === 0) return;

		const audioBlob = new Blob(
			chunks.map((b64) =>
				Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
			),
			{ type: "audio/mp3" }
		);

		// Cache the assembled audio
		await cacheAudio(messageId, audioBlob);

		// Start playback with the assembled blob and any provided callbacks
		await startPlayback(messageId, text, {
			audioBlob,
			onComplete: options.onComplete,
			onError: options.onError,
		});

		// Clear chunks for this message
		audioChunksRef.current.delete(messageId);
	};

	// Cleanup
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.removeEventListener(
					"timeupdate",
					handleTimeUpdate
				);
				audioRef.current = null;
			}
		};
	}, []);

	return {
		currentMessageId,
		isPaused,
		highlightedSentenceIdx,
		startPlayback,
		pausePlayback,
		resumePlayback,
		stopPlayback,
		addAudioChunk,
		finalizeAudio,
		checkCachedAudio,
		ensureAudioAvailable,
	};
};
