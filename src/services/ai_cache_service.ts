import { FirestoreService } from './firestore';
import { Config } from '../config';
import { AICache } from '../types/firestore';

export class AICacheService {
  private firestore: FirestoreService;
  private collection: string;

  constructor() {
    this.firestore = new FirestoreService();
    this.collection = Config.COLLECTIONS.AI_CACHE;
  }

  /**
   * Calculate SHA-256 hash of the input string
   */
  private calculateHash(text: string): string {
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
    let txtHash = '';
    for (let i = 0; i < rawHash.length; i++) {
      let hashVal = rawHash[i];
      if (hashVal < 0) {
        hashVal += 256;
      }
      if (hashVal.toString(16).length === 1) {
        txtHash += '0';
      }
      txtHash += hashVal.toString(16);
    }
    return txtHash;
  }

  /**
   * Retrieve cached response if available and valid
   */
  getCachedResponse(prompt: string, model: string): string | null {
    const hash = this.calculateHash(prompt + model);
    
    try {
      // Use hash as ID for direct lookup (O(1))
      const cache = this.firestore.getDocument<AICache>(this.collection, hash);
      
      if (!cache || !cache.response) {
        return null;
      }

      // Check expiration
      if (new Date(cache.expiresAt) < new Date()) {
        console.log(`Cache expired for hash: ${hash}`);
        return null; 
      }

      console.log(`Cache hit for hash: ${hash}`);
      return cache.response;
    } catch (e) {
      console.warn('Cache lookup failed', e);
      return null;
    }
  }

  /**
   * Save response to cache
   */
  cacheResponse(prompt: string, model: string, response: string, durationDays: number = 30): void {
    const hash = this.calculateHash(prompt + model);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const cacheEntry: AICache = {
      id: hash,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      promptHash: hash,
      prompt: prompt,
      response: response,
      model: model,
      expiresAt: expiresAt
    };

    try {
      this.firestore.setDocument(this.collection, hash, cacheEntry);
      console.log(`Cached response for hash: ${hash}`);
    } catch (e) {
      console.warn('Failed to cache AI response', e);
    }
  }
}