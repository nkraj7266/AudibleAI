import {
	storeAudio,
	getAudio,
	clearOldAudio,
	clearAllAudio,
} from "./indexedDB";

/**
 * Store audio data in IndexedDB
 * @param {string} messageId - The message ID as cache key
 * @param {Blob} audioBlob - Audio data as Blob
 */
export const cacheAudio = async (messageId, audioBlob) => {
	try {
		await storeAudio(messageId, audioBlob);
	} catch (error) {
		console.warn("Failed to cache audio:", error);
		// If storage is getting full, clear old items
		await clearOldAudio();
	}
};

/**
 * Retrieve cached audio data
 * @param {string} messageId - The message ID as cache key
 * @returns {Promise<Blob|null>} Audio data as Blob or null if not found
 */
export const getCachedAudio = async (messageId) => {
	try {
		const audioBlob = await getAudio(messageId);
		return audioBlob;
	} catch (error) {
		console.warn("Failed to retrieve cached audio:", error);
		return null;
	}
};

/**
 * Clear expired items from cache
 */
export const clearExpiredCache = async () => {
	try {
		await clearOldAudio();
	} catch (error) {
		console.warn("Failed to clear expired cache:", error);
	}
};

/**
 * Clear all audio cache items
 */
export const clearAllCache = async () => {
	try {
		await clearAllAudio();
	} catch (error) {
		console.warn("Failed to clear cache:", error);
	}
};
