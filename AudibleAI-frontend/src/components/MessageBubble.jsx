import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./MessageBubble.module.css";
import { splitIntoSentences } from "../utils/textSegmentation";

const MessageBubble = ({
	message,
	onPlay,
	onPause,
	isPlaying,
	highlightedSentenceIdx,
	showPlayback,
}) => {
	const isUser = message.sender === "USER";
	const sentences = useMemo(
		() => splitIntoSentences(message.text),
		[message.text]
	);

	// Create highlighted text display
	const content = useMemo(() => {
		if (!message.text) return null;

		// If no highlighting or invalid index, render normally
		if (
			highlightedSentenceIdx === null ||
			!sentences[highlightedSentenceIdx]
		) {
			return <ReactMarkdown breaks>{message.text}</ReactMarkdown>;
		}

		const currentSentence = sentences[highlightedSentenceIdx];
		const { start, end } = currentSentence;

		return (
			<div className={styles.highlightContainer}>
				{start > 0 && (
					<ReactMarkdown breaks>
						{message.text.slice(0, start)}
					</ReactMarkdown>
				)}
				<span className={styles.highlightedText}>
					<ReactMarkdown breaks>
						{message.text.slice(start, end)}
					</ReactMarkdown>
				</span>
				{end < message.text.length && (
					<ReactMarkdown breaks>
						{message.text.slice(end)}
					</ReactMarkdown>
				)}
			</div>
		);
	}, [message.text, highlightedSentenceIdx, sentences]);

	return (
		<div className={isUser ? styles.userBubble : styles.aiBubble}>
			<span className={styles.sender}>
				{isUser ? "You" : "AI"}
				{!isUser && showPlayback && (
					<i
						className={`ri-${
							isPlaying ? "pause" : "volume-up"
						}-fill`}
						style={{
							marginLeft: 8,
							cursor: "pointer",
							color: "#f9a825",
							fontSize: "1.2em",
						}}
						title={isPlaying ? "Pause playback" : "Play message"}
						onClick={isPlaying ? onPause : onPlay}
					/>
				)}
			</span>
			<div className={styles.text}>{content}</div>
		</div>
	);
};

export default MessageBubble;
