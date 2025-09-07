import {
	storeAudio,
	getAudio,
	clearOldAudio,
	clearAllAudio,
} from "./indexedDB";
// import { del } from "idb-keyval";

/**
 * Store audio data and metadata in IndexedDB
 * @param {string} messageId - The message ID as cache key
 * @param {Blob} audioBlob - Audio data as Blob
 * @param {Object} metadata - Additional metadata about the audio (e.g., isLast)
 */
export const cacheAudio = async (messageId, audioBlob, metadata = {}) => {
	try {
		const cacheData = {
			blob: audioBlob,
			metadata,
			timestamp: Date.now(),
		};
		await storeAudio(messageId, cacheData);
	} catch (error) {
		console.warn("Failed to cache audio:", error);
		// If storage is getting full, clear old items
		await clearOldAudio();
	}
};

/**
 * Retrieve cached audio data and metadata
 * @param {string} messageId - The message ID as cache key
 * @returns {Promise<{blob: Blob, metadata: Object}|null>} Audio data and metadata or null if not found
 */
export const getCachedAudio = async (messageId) => {
	try {
		const cacheData = await getAudio(messageId);
		if (!cacheData) return null;

		// Handle legacy format (just blob)
		if (cacheData instanceof Blob) {
			return {
				blob: cacheData,
				metadata: {},
			};
		}

		return {
			blob: cacheData.blob,
			metadata: cacheData.metadata || {},
		};
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

/**
 * Deletes a cached audio blob from IndexedDB.
 * @param {string} key - The key of the audio data to delete.
 * @returns {Promise<void>}
 */
export const deleteCachedAudio = (key) => {
	console.log(`[Cache] Deleting audio with key: ${key}`);
	return del(key);
};
