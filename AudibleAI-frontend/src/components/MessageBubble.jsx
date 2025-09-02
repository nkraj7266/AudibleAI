import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "./MessageBubble.module.css";

function MessageBubble({ message }) {
	const isUser = message.sender === "USER";
	return (
		<div className={isUser ? styles.userBubble : styles.aiBubble}>
			<span className={styles.sender}>{isUser ? "You" : "AI"}</span>
			<span className={styles.text}>
				<ReactMarkdown breaks>{message.text}</ReactMarkdown>
			</span>
		</div>
	);
}

export default MessageBubble;
