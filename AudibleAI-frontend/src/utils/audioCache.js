// Cache expiry time in milliseconds (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Cache key prefix
const CACHE_PREFIX = "audio_cache_";

/**
 * Store audio data in localStorage with expiry
 * @param {string} messageId - The message ID as cache key
 * @param {Blob} audioBlob - Audio data as Blob
 */
export const cacheAudio = async (messageId, audioBlob) => {
	try {
		// Convert Blob to Base64
		const buffer = await audioBlob.arrayBuffer();
		const base64String = btoa(
			String.fromCharCode(...new Uint8Array(buffer))
		);

		const cacheItem = {
			data: base64String,
			type: audioBlob.type,
			timestamp: Date.now(),
		};
		localStorage.setItem(
			CACHE_PREFIX + messageId,
			JSON.stringify(cacheItem)
		);
	} catch (error) {
		console.warn("Failed to cache audio:", error);
		// If localStorage is full, clear old items
		clearExpiredCache();
	}
};

/**
 * Retrieve cached audio data if not expired
 * @param {string} messageId - The message ID as cache key
 * @returns {Blob|null} Audio data as Blob or null if not found/expired
 */
export const getCachedAudio = (messageId) => {
	try {
		const cached = localStorage.getItem(CACHE_PREFIX + messageId);
		if (!cached) return null;

		const cacheItem = JSON.parse(cached);
		const now = Date.now();

		// Check if cache is expired
		if (now - cacheItem.timestamp > CACHE_EXPIRY) {
			localStorage.removeItem(CACHE_PREFIX + messageId);
			return null;
		}

		// Convert Base64 back to Blob
		const binaryString = atob(cacheItem.data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return new Blob([bytes], { type: cacheItem.type || "audio/mp3" });
	} catch (error) {
		console.warn("Failed to retrieve cached audio:", error);
		return null;
	}
};

/**
 * Clear expired items from cache
 */
export const clearExpiredCache = () => {
	try {
		const now = Date.now();
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key.startsWith(CACHE_PREFIX)) {
				const cached = localStorage.getItem(key);
				const cacheItem = JSON.parse(cached);
				if (now - cacheItem.timestamp > CACHE_EXPIRY) {
					localStorage.removeItem(key);
				}
			}
		}
	} catch (error) {
		console.warn("Failed to clear expired cache:", error);
	}
};

/**
 * Clear all audio cache items
 */
export const clearAllCache = () => {
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key.startsWith(CACHE_PREFIX)) {
				localStorage.removeItem(key);
			}
		}
	} catch (error) {
		console.warn("Failed to clear cache:", error);
	}
};
