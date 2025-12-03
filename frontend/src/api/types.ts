/**
 * Shared TypeScript interfaces for API communication
 */

/**
 * Customer address structure
 */
export interface CustomerAddress {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    building?: string;
}

/**
 * Customer relationship
 */
export interface CustomerRelationship {
    relatedCustomerId: string;
    relationType: string;
    description?: string;
}

/**
 * Customer entity (matches Firestore schema)
 */
export interface Customer {
    id: string;
    // 基本情報
    name: string;
    nameKana?: string;
    type?: 'CORPORATION' | 'INDIVIDUAL';
    gender?: string;

    // 連絡先
    phone?: string;
    mobile?: string;
    email?: string;

    // 住所 (構造化)
    address?: CustomerAddress;

    // 関係性
    relationships?: CustomerRelationship[];

    // メタデータ
    originalId?: string;
    notes?: string;

    // タイムスタンプ
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;

    // Legacy field for backwards compatibility
    kana?: string;
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
