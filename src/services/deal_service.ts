import { FirestoreService } from './firestore';
import { Config } from '../config';
import { Deal } from '../types/firestore';

export class DealService {
  private firestore: FirestoreService;
  private collection: string;

  constructor() {
    this.firestore = new FirestoreService();
    this.collection = Config.COLLECTIONS.DEALS;
  }

  /**
   * Create a new deal
   */
  createDeal(deal: Deal): Deal {
    // Ensure ID exists
    if (!deal.id) {
      deal.id = Utilities.getUuid();
    }
    
    // Set timestamps if missing
    const now = new Date().toISOString();
    if (!deal.createdAt) deal.createdAt = now;
    deal.updatedAt = now;

    this.firestore.setDocument(this.collection, deal.id, deal);

    // Audit Log
    this.firestore.createAuditLog({
      operation: 'CREATE',
      collection: this.collection,
      documentId: deal.id,
      userId: 'system', // TODO: Implement user context
      timestamp: now,
      details: deal as unknown as Record<string, unknown>
    });

    return deal;
  }

  /**
   * Get deal by ID
   */
  getDeal(id: string): Deal | null {
    const data = this.firestore.getDocument(this.collection, id);
    if (!data) return null;
    return data as Deal;
  }

  /**
   * Update deal
   */
  updateDeal(id: string, updates: Partial<Deal>): Deal {
    const current = this.getDeal(id);
    if (!current) {
      throw new Error(`Deal not found: ${id}`);
    }

    // Merge updates
    const updatedDeal = { ...current, ...updates };
    updatedDeal.updatedAt = new Date().toISOString();

    this.firestore.setDocument(this.collection, id, updatedDeal);

    // Audit Log
    this.firestore.createAuditLog({
      operation: 'UPDATE',
      collection: this.collection,
      documentId: id,
      userId: 'system', // TODO: Implement user context
      timestamp: updatedDeal.updatedAt,
      details: updates as unknown as Record<string, unknown>
    });

    return updatedDeal;
  }
}