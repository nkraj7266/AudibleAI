import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./MessageBubble.module.css";
import { splitIntoSentences } from "../utils/textSegmentation";

const MessageBubble = ({
	message,
	onPlay,
	isPlaying,
	highlightedSentenceIdx,
	showPlayback,
}) => {
	const isUser = message.sender === "USER";
	const sentences = useMemo(
		() => splitIntoSentences(message.text),
		[message.text]
	);

	// Create highlighted text display with markdown support
	const content = useMemo(() => {
		if (!message.text) return null;

		// If no highlighting or invalid index, render normally
		if (
			highlightedSentenceIdx === null ||
			!sentences[highlightedSentenceIdx]
		) {
			return <ReactMarkdown>{message.text}</ReactMarkdown>;
		}

		const currentSentence = sentences[highlightedSentenceIdx];
		const { start, end } = currentSentence;

		// For highlighting, we need to work with the original markdown text
		return (
			<div className={styles.highlightContainer}>
				{start > 0 && (
					<ReactMarkdown>
						{message.text.slice(0, start)}
					</ReactMarkdown>
				)}
				<span className={styles.highlightedText}>
					<ReactMarkdown>
						{message.text.slice(start, end)}
					</ReactMarkdown>
				</span>
				{end < message.text.length && (
					<ReactMarkdown>{message.text.slice(end)}</ReactMarkdown>
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
							color: isPlaying ? "#d32f2f" : "#1565c0",
							fontSize: "1.2em",
						}}
						title={isPlaying ? "Playing..." : "Play message"}
						onClick={onPlay}
					/>
				)}
			</span>
			<div className={styles.text}>{content}</div>
		</div>
	);
};

export default MessageBubble;
