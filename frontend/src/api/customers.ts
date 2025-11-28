/**
 * Customer API
 * 
 * Provides CRUD operations for customer data
 * Automatically switches between mock data (dev) and real GAS backend (prod)
 */

import { callGAS, isDevMode } from './client';
import type { Customer } from './types';
import {
    getMockCustomers,
    searchMockCustomers,
    getMockCustomer,
    createMockCustomer,
    updateMockCustomer,
    deleteMockCustomer,
} from './mocks/customers';

/**
 * Get all customers
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
 * Export all customer API methods
 */
export const customersAPI = {
    getCustomers,
    searchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
