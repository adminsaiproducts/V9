/**
 * React hook for customer data management
 * 
 * Provides automatic loading/error states and data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { getCustomers, searchCustomers } from '../api/customers';
import { getErrorMessage } from '../api/client';
import type { Customer } from '../api/types';

interface UseCustomersResult {
    customers: Customer[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    search: (query: string) => Promise<void>;
}

/**
 * Hook for fetching and managing customer data
 * 
 * @param autoFetch - Automatically fetch data on mount (default: true)
 */
export function useCustomers(autoFetch = true): UseCustomersResult {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch all customers
     */
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Search customers by query
     */
    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            // Empty query: fetch all customers
            return fetchCustomers();
        }

        setLoading(true);
        setError(null);
        try {
            const data = await searchCustomers(query);
            setCustomers(data);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Failed to search customers:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchCustomers]);

    /**
     * Auto-fetch on mount
     */
    useEffect(() => {
        if (autoFetch) {
            fetchCustomers();
        }
    }, [autoFetch, fetchCustomers]);

    return {
        customers,
        loading,
        error,
        refetch: fetchCustomers,
        search,
    };
}
