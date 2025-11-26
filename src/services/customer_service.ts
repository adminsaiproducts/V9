import { FirestoreService } from './firestore';
import { Config } from '../config';
import { Customer } from '../types/firestore';

export class CustomerService {
  private firestore: FirestoreService;
  private collection: string;

  constructor() {
    this.firestore = new FirestoreService();
    this.collection = Config.COLLECTIONS.CUSTOMERS;
  }

  /**
   * Create a new customer
   */
  createCustomer(customer: Customer): Customer {
    // Ensure ID exists
    if (!customer.id) {
      customer.id = Utilities.getUuid();
    }
    
    // Set timestamps if missing
    const now = new Date().toISOString();
    if (!customer.createdAt) customer.createdAt = now;
    customer.updatedAt = now;

    this.firestore.setDocument(this.collection, customer.id, customer);

    // Audit Log
    this.firestore.createAuditLog({
      operation: 'CREATE',
      collection: this.collection,
      documentId: customer.id,
      userId: 'system', // TODO: Implement user context
      timestamp: now,
      details: customer as unknown as Record<string, unknown>
    });

    return customer;
  }

  /**
   * Get customer by ID
   */
  getCustomer(id: string): Customer | null {
    const data = this.firestore.getDocument(this.collection, id);
    if (!data) return null;
    return data as Customer;
  }

  /**
   * Update customer
   */
  updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const current = this.getCustomer(id);
    if (!current) {
      throw new Error(`Customer not found: ${id}`);
    }

    // Merge updates
    const updatedCustomer = { ...current, ...updates };
    updatedCustomer.updatedAt = new Date().toISOString();

    this.firestore.setDocument(this.collection, id, updatedCustomer);

    // Audit Log
    this.firestore.createAuditLog({
      operation: 'UPDATE',
      collection: this.collection,
      documentId: id,
      userId: 'system', // TODO: Implement user context
      timestamp: updatedCustomer.updatedAt,
      details: updates as unknown as Record<string, unknown>
    });

    return updatedCustomer;
  }

  /**
   * Search customers (Basic implementation for Phase 2)
   * TODO: Implement full search with filters
   */
  searchCustomers(_query: string): Customer[] {
    // Use the newly added listDocuments method
    // For search query, we would need a more complex implementation or client-side filtering on a limited set
    // Phase 2: Simple list recent 50 customers
    return this.firestore.listDocuments<Customer>(this.collection, 50);
  }
}