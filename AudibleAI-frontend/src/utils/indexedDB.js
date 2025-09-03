// Constants for IndexedDB
const DB_NAME = "AudioCache";
const DB_VERSION = 1;
const STORE_NAME = "audio";

// Initialize IndexedDB
const initDB = () => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error("Error opening IndexedDB");
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, {
					keyPath: "messageId",
				});
				store.createIndex("timestamp", "timestamp", { unique: false });
			}
		};
	});
};

// Store audio data
export const storeAudio = async (messageId, audioBlob) => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);

			const item = {
				messageId,
				audio: audioBlob,
				timestamp: Date.now(),
			};

			const request = store.put(item);

			request.onsuccess = () => resolve(true);
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error("Error storing audio in IndexedDB:", error);
		return false;
	}
};

// Retrieve audio data
export const getAudio = async (messageId) => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(messageId);

			request.onsuccess = () => {
				resolve(request.result?.audio || null);
			};
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error("Error retrieving audio from IndexedDB:", error);
		return null;
	}
};

// Clear old audio data (older than 24 hours)
export const clearOldAudio = async () => {
	try {
		const db = await initDB();
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index("timestamp");

		// 24 hours ago
		const cutoff = Date.now() - 24 * 60 * 60 * 1000;

		return new Promise((resolve, reject) => {
			const request = index.openCursor();

			request.onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					if (cursor.value.timestamp < cutoff) {
						store.delete(cursor.primaryKey);
					}
					cursor.continue();
				}
			};

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.error("Error clearing old audio from IndexedDB:", error);
	}
};

// Clear all audio data
export const clearAllAudio = async () => {
	try {
		const db = await initDB();
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.clear();
	} catch (error) {
		console.error("Error clearing audio from IndexedDB:", error);
	}
};
