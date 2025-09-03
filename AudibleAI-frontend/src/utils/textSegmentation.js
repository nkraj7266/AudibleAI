/**
 * Split text into sentences for synchronized highlighting
 * @param {string} text - The text to split into sentences
 * @returns {Array<{text: string, start: number, end: number}>} Array of sentence objects with text and position
 */
export const splitIntoSentences = (text) => {
	if (!text) return [];

	// Split by common sentence terminators while preserving them
	const sentenceRegex = /[^.!?]+[.!?]+/g;
	const sentences = [];
	let lastIndex = 0;

	text.replace(sentenceRegex, (match, offset) => {
		const sentence = match.trim();
		if (sentence) {
			// Find the actual start position in original text
			const start = text.indexOf(match, lastIndex);
			sentences.push({
				text: match,
				start: start,
				end: start + match.length,
			});
			lastIndex = start + match.length;
		}
	});

	// Handle any remaining text that doesn't end with a terminator
	const remaining = text.slice(lastIndex).trim();
	if (remaining) {
		const start = text.indexOf(remaining, lastIndex);
		sentences.push({
			text: remaining,
			start: start,
			end: start + remaining.length,
		});
	}

	return sentences;
};

/**
 * Render text with a highlighted segment
 * @param {string} text - The full text
 * @param {number} highlightStart - Start index of highlight
 * @param {number} highlightEnd - End index of highlight
 * @returns {Array} Array of text segments with highlighting information
 */
export const renderHighlightedText = (text, highlightStart, highlightEnd) => {
	if (!text || highlightStart === null || highlightEnd === null) {
		return [{ text, highlighted: false }];
	}

	const segments = [];

	// Add pre-highlight text
	if (highlightStart > 0) {
		segments.push({
			text: text.slice(0, highlightStart),
			highlighted: false,
		});
	}

	// Add highlighted text
	segments.push({
		text: text.slice(highlightStart, highlightEnd),
		highlighted: true,
	});

	// Add post-highlight text
	if (highlightEnd < text.length) {
		segments.push({
			text: text.slice(highlightEnd),
			highlighted: false,
		});
	}

	return segments;
};
