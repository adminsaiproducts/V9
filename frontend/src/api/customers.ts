/**
 * Customer API
 *
 * Provides CRUD operations for customer data
 * Automatically switches between mock data (dev) and real GAS backend (prod)
 *
 * OPTIMIZATION: Uses pagination and caching to reduce API calls
 */

import { callGAS, callGASRaw, isDevMode } from './client';
import type { Customer, DuplicateCandidate, MergeResult, QuickCustomerCreate } from './types';
import {
    getMockCustomers,
    searchMockCustomers,
    getMockCustomer,
    createMockCustomer,
    updateMockCustomer,
    deleteMockCustomer,
} from './mocks/customers';

/**
 * Paginated response type
 */
export interface PaginatedCustomersResponse {
    data: Customer[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Get customers with pagination (OPTIMIZED)
 * Uses server-side pagination to reduce data transfer
 *
 * @param page - Page number (0-indexed)
 * @param pageSize - Number of records per page (default 100)
 */
export async function getCustomersPaginated(
    page: number = 0,
    pageSize: number = 100,
    forceRefresh: boolean = false
): Promise<PaginatedCustomersResponse> {
    if (isDevMode()) {
        const allCustomers = await getMockCustomers();
        const start = page * pageSize;
        const end = start + pageSize;
        return {
            data: allCustomers.slice(start, end),
            total: allCustomers.length,
            page,
            pageSize,
        };
    }
    // Use callGASRaw to get full response with total, page, pageSize
    // (callGAS only returns response.data, losing pagination metadata)
    return callGASRaw<PaginatedCustomersResponse>('api_getCustomersPaginated', { page, pageSize, forceRefresh });
}

/**
 * Get all customers (LEGACY - use getCustomersPaginated instead)
 * @deprecated Use getCustomersPaginated for better performance
 */
export async function getCustomers(): Promise<Customer[]> {
    if (isDevMode()) {
        return getMockCustomers();
    }
    return callGAS<Customer[]>('api_getCustomers');
}

/**
 * Search customers by query
 *
 * @param query - Search term (name, kana, email, phone)
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
    if (isDevMode()) {
        return searchMockCustomers(query);
    }
    return callGAS<Customer[]>('api_searchCustomers', query);
}

// In-memory cache for all customers (for fast client-side search)
let allCustomersCache: Customer[] | null = null;
let allCustomersCacheTime: number = 0;
const ALL_CUSTOMERS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get ALL customers for client-side search
 * Caches in memory for fast repeated searches
 */
export async function getAllCustomersForSearch(): Promise<Customer[]> {
    // Check cache
    if (allCustomersCache && Date.now() - allCustomersCacheTime < ALL_CUSTOMERS_CACHE_TTL) {
        console.log('[getAllCustomersForSearch] Cache hit:', allCustomersCache.length, 'customers');
        return allCustomersCache;
    }

    console.log('[getAllCustomersForSearch] Fetching all customers...');
    if (isDevMode()) {
        allCustomersCache = await getMockCustomers();
    } else {
        allCustomersCache = await callGAS<Customer[]>('api_getAllCustomers');
    }
    allCustomersCacheTime = Date.now();
    console.log('[getAllCustomersForSearch] Fetched:', allCustomersCache.length, 'customers');
    return allCustomersCache;
}

/**
 * Invalidate the all-customers cache
 */
export function invalidateAllCustomersCache(): void {
    allCustomersCache = null;
    allCustomersCacheTime = 0;
    console.log('[getAllCustomersForSearch] Cache invalidated');
}

/**
 * Get single customer by ID
 * 
 * @param id - Customer ID
 */
export async function getCustomer(id: string): Promise<Customer> {
    if (isDevMode()) {
        return getMockCustomer(id);
    }
    return callGAS<Customer>('api_getCustomer', id);
}

/**
 * Create new customer
 * 
 * @param data - Customer data
 */
export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
    if (isDevMode()) {
        return createMockCustomer(data);
    }
    return callGAS<Customer>('api_createCustomer', data);
}

/**
 * Update existing customer
 * 
 * @param id - Customer ID
 * @param data - Updated customer data
 */
export async function updateCustomer(
    id: string,
    data: Partial<Customer>
): Promise<Customer> {
    if (isDevMode()) {
        return updateMockCustomer(id, data);
    }
    return callGAS<Customer>('api_updateCustomer', id, data);
}

/**
 * Delete customer (soft delete)
 * 
 * @param id - Customer ID
 */
export async function deleteCustomer(id: string): Promise<void> {
    if (isDevMode()) {
        return deleteMockCustomer(id);
    }
    return callGAS<void>('api_deleteCustomer', id);
}

/**
 * Quick create customer (minimal fields, for relationship entry)
 * Creates a customer with just name and optional contact info
 *
 * @param data - Minimal customer data
 */
export async function quickCreateCustomer(data: QuickCustomerCreate): Promise<Customer> {
    if (isDevMode()) {
        // Mock: create with minimal data
        return createMockCustomer({
            name: data.name,
            nameKana: data.nameKana,
            phone: data.phone,
        });
    }
    return callGAS<Customer>('api_quickCreateCustomer', data);
}

/**
 * Find potential duplicate customers
 * Searches for customers that might be duplicates based on name, phone, email, address
 *
 * @param customerId - ID of the customer to check for duplicates
 * @param options - Optional: specific fields to compare
 */
export async function findDuplicates(
    customerId: string,
    options?: { fields?: string[] }
): Promise<DuplicateCandidate[]> {
    if (isDevMode()) {
        // Mock: return empty array in dev mode
        return [];
    }
    return callGAS<DuplicateCandidate[]>('api_findDuplicates', customerId, options);
}

/**
 * Search for potential duplicates by customer data (before saving)
 * Useful to check for duplicates when creating a new customer
 *
 * @param data - Customer data to check
 */
export async function checkForDuplicates(
    data: Partial<Customer>
): Promise<DuplicateCandidate[]> {
    if (isDevMode()) {
        // Mock: simple name matching
        const allCustomers = await getMockCustomers();
        const candidates: DuplicateCandidate[] = [];

        for (const c of allCustomers) {
            let matchScore = 0;
            const matchReasons: DuplicateCandidate['matchReasons'] = [];

            // Name exact match
            if (data.name && c.name === data.name) {
                matchScore += 0.5;
                matchReasons.push({
                    field: 'name',
                    sourceValue: data.name,
                    targetValue: c.name,
                    matchType: 'exact',
                    confidence: 1.0,
                });
            }
            // Name partial match (contains)
            else if (data.name && c.name && (c.name.includes(data.name) || data.name.includes(c.name))) {
                matchScore += 0.3;
                matchReasons.push({
                    field: 'name',
                    sourceValue: data.name,
                    targetValue: c.name,
                    matchType: 'partial',
                    confidence: 0.6,
                });
            }

            // Phone exact match
            if (data.phone && c.phone && normalizePhone(data.phone) === normalizePhone(c.phone)) {
                matchScore += 0.4;
                matchReasons.push({
                    field: 'phone',
                    sourceValue: data.phone,
                    targetValue: c.phone || '',
                    matchType: 'exact',
                    confidence: 0.95,
                });
            }

            // Email exact match
            if (data.email && c.email && data.email.toLowerCase() === c.email.toLowerCase()) {
                matchScore += 0.4;
                matchReasons.push({
                    field: 'email',
                    sourceValue: data.email,
                    targetValue: c.email || '',
                    matchType: 'exact',
                    confidence: 0.95,
                });
            }

            if (matchScore >= 0.3 && matchReasons.length > 0) {
                candidates.push({
                    customer: c,
                    matchScore: Math.min(matchScore, 1.0),
                    matchReasons,
                });
            }
        }

        return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    }
    return callGAS<DuplicateCandidate[]>('api_checkForDuplicates', data);
}

/**
 * Merge two customer records
 * Combines data from both records, resolving conflicts as specified
 *
 * @param primaryId - ID of the primary customer (will be kept)
 * @param secondaryId - ID of the secondary customer (will be merged and archived)
 * @param conflictResolutions - How to resolve each conflict
 */
export async function mergeCustomers(
    primaryId: string,
    secondaryId: string,
    conflictResolutions: Record<string, 'primary' | 'secondary' | unknown>
): Promise<MergeResult> {
    if (isDevMode()) {
        throw new Error('Merge not available in dev mode');
    }
    return callGAS<MergeResult>('api_mergeCustomers', primaryId, secondaryId, conflictResolutions);
}

/**
 * Get merge preview (without actually merging)
 * Shows what the merged result would look like and what conflicts exist
 */
export async function getMergePreview(
    primaryId: string,
    secondaryId: string
): Promise<MergeResult> {
    if (isDevMode()) {
        throw new Error('Merge preview not available in dev mode');
    }
    return callGAS<MergeResult>('api_getMergePreview', primaryId, secondaryId);
}

/**
 * Helper: Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
    return phone.replace(/[-\s\(\)]/g, '');
}

/**
 * Export all customer API methods
 */
export const customersAPI = {
    getCustomers,
    getCustomersPaginated,
    searchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    quickCreateCustomer,
    findDuplicates,
    checkForDuplicates,
    mergeCustomers,
    getMergePreview,
};
