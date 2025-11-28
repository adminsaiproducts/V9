/**
 * Shared TypeScript interfaces for API communication
 */

/**
 * Customer entity
 */
export interface Customer {
    id: string;
    name: string;
    kana?: string;
    phone?: string;
    email?: string;
    address?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

/**
 * Standard API response wrapper
 */
export interface APIResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    timestamp?: string;
}

/**
 * Error response from backend
 */
export interface APIError {
    status: 'error';
    message: string;
    code?: string;
}

/**
 * Search query parameters
 */
export interface SearchParams {
    query?: string;
    limit?: number;
    offset?: number;
}
