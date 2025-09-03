import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "./MessageBubble.module.css";

const MessageBubble = ({
	message,
	onPlay,
	onPause,
	isPlaying,
	isHighlightedSentence,
	showPlayback,
}) => {
	const isUser = message.sender === "USER";
	return (
		<div className={isUser ? styles.userBubble : styles.aiBubble}>
			<span className={styles.sender}>
				{isUser ? "You" : "AI"}
				{/* Playback controls for AI messages only */}
				{!isUser &&
					showPlayback &&
					(isPlaying ? (
						<i
							className="ri-pause-fill"
							style={{
								marginLeft: 8,
								cursor: "pointer",
								color: "#f9a825",
								fontSize: "1.2em",
							}}
							title="Pause playback"
							onClick={onPause}
						/>
					) : (
						<i
							className="ri-volume-up-fill"
							style={{
								marginLeft: 8,
								cursor: "pointer",
								color: "#f9a825",
								fontSize: "1.2em",
							}}
							title="Play message"
							onClick={onPlay}
						/>
					))}
			</span>
			<span className={styles.text}>
				{/* Highlight current sentence if needed */}
				<ReactMarkdown
					breaks
					components={{
						p: ({ node, ...props }) => (
							<p
								{...props}
								style={
									isHighlightedSentence
										? {
												background: "#fffde7",
												fontWeight: "bold",
										  }
										: {}
								}
							/>
						),
					}}
				>
					{message.text}
				</ReactMarkdown>
			</span>
		</div>
	);
};

export default MessageBubble;
