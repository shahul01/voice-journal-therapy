/**
 * LRU cache for Gemini API responses
 * Reduces redundant API calls by caching responses based on conversation context hash
 */

interface CacheEntry {
	response: string;
	timestamp: number;
	hash: string;
}

interface CacheConfig {
	maxSize: number;
	ttl: number; // Time to live in milliseconds
}

const DEFAULT_CONFIG: CacheConfig = {
	maxSize: 50,
	ttl: 30 * 60 * 1000 // 30 minutes
};

function hashContext(messages: Array<{ role: string; parts: Array<{ text: string }> }>): string {
	const key = JSON.stringify(
		messages.map((msg) => ({
			role: msg.role,
			text: msg.parts.map((p) => p.text).join(' ')
		}))
	);

	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		const char = key.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash.toString(36);
}

function createResponseCache(config: CacheConfig = DEFAULT_CONFIG) {
	const cache = new Map<string, CacheEntry>();
	const accessOrder: string[] = [];

	function get(hash: string): string | null {
		const entry = cache.get(hash);
		if (!entry) return null;

		const age = Date.now() - entry.timestamp;
		if (age > config.ttl) {
			cache.delete(hash);
			const index = accessOrder.indexOf(hash);
			if (index > -1) accessOrder.splice(index, 1);
			return null;
		}

		const index = accessOrder.indexOf(hash);
		if (index > -1) {
			accessOrder.splice(index, 1);
		}
		accessOrder.push(hash);

		return entry.response;
	}

	function set(hash: string, response: string): void {
		if (cache.has(hash)) {
			cache.set(hash, { response, timestamp: Date.now(), hash });
			const index = accessOrder.indexOf(hash);
			if (index > -1) {
				accessOrder.splice(index, 1);
			}
			accessOrder.push(hash);
			return;
		}

		if (cache.size >= config.maxSize) {
			const oldestHash = accessOrder.shift();
			if (oldestHash) {
				cache.delete(oldestHash);
			}
		}

		cache.set(hash, { response, timestamp: Date.now(), hash });
		accessOrder.push(hash);
	}

	function clear(): void {
		cache.clear();
		accessOrder.length = 0;
	}

	function size(): number {
		return cache.size;
	}

	return {
		get,
		set,
		clear,
		size,
		hashContext
	};
}

export const responseCache = createResponseCache();

export function getCachedResponse(
	messages: Array<{ role: string; parts: Array<{ text: string }> }>
): string | null {
	const hash = responseCache.hashContext(messages);
	const cached = responseCache.get(hash);
	if (cached) {
		console.log('[ResponseCache] Cache hit', { hash: hash.slice(0, 8), cacheSize: responseCache.size() });
	} else {
		console.log('[ResponseCache] Cache miss', { hash: hash.slice(0, 8), cacheSize: responseCache.size() });
	}
	return cached;
}

export function cacheResponse(
	messages: Array<{ role: string; parts: Array<{ text: string }> }>,
	response: string
): void {
	const hash = responseCache.hashContext(messages);
	responseCache.set(hash, response);
	console.log('[ResponseCache] Cached response', { hash: hash.slice(0, 8), responseLength: response.length, cacheSize: responseCache.size() });
}