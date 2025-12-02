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
    // Fetch all customers (increased limit from 50 to 10000)
    // For full-text search, consider implementing Firestore queries or Algolia integration
    return this.firestore.listDocuments<Customer>(this.collection, 10000);
  }

  /**
   * List customers with pagination (for DataGrid)
   * @param page - Page number (0-indexed)
   * @param pageSize - Number of items per page
   * @param sortField - Field to sort by (optional)
   * @param sortOrder - Sort direction: 'asc' or 'desc' (optional)
   * @returns Object with data array and total count
   */
  listCustomersPaginated(
    page: number = 0,
    pageSize: number = 100,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): { data: Customer[]; total: number } {
    const offset = page * pageSize;

    // For now, use simple list with limit
    // TODO: Implement proper Firestore pagination with cursors
    const allCustomers = this.firestore.listDocuments<Customer>(this.collection, offset + pageSize);

    // Slice to get current page
    const pageData = allCustomers.slice(offset, offset + pageSize);

    // Sort if specified
    if (sortField && sortOrder) {
      pageData.sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // TODO: Get actual total count from Firestore
    // For now, return a large number (we know we have 10,852)
    return {
      data: pageData,
      total: 10852
    };
  }
}