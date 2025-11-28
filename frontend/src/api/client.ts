/**
 * Core API Client for GAS Backend Communication
 * 
 * Provides Promise-based wrapper around google.script.run with:
 * - Environment detection (dev vs production)
 * - Automatic error handling
 * - TypeScript support
 */

import type { APIResponse, APIError } from './types';

/**
 * Check if running in development mode
 */
const isDevelopment = import.meta.env.DEV;

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
    NETWORK: 'ネットワークエラーが発生しました。再度お試しください。',
    TIMEOUT: 'リクエストがタイムアウトしました。',
    UNKNOWN: '予期しないエラーが発生しました。',
    NOT_FOUND: '指定されたデータが見つかりません。',
    PERMISSION: 'アクセス権限がありません。',
} as const;

/**
 * Custom error class for API errors
 */
export class APIClientError extends Error {
    constructor(
        message: string,
        public code?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'APIClientError';
    }
}

/**
 * Call a GAS backend function with Promise wrapper
 * 
 * @param methodName - Name of the GAS function to call
 * @param args - Arguments to pass to the function
 * @returns Promise resolving to the function result
 */
export async function callGAS<T>(
    methodName: string,
    ...args: any[]
): Promise<T> {
    // Development mode: throw error to indicate mock should be used
    if (isDevelopment) {
        throw new APIClientError(
            'Development mode: Use mock data instead',
            'DEV_MODE'
        );
    }

    // Production mode: call google.script.run
    return new Promise<T>((resolve, reject) => {
        try {
            // Check if google.script.run is available
            if (typeof google === 'undefined' || !google.script || !google.script.run) {
                reject(new APIClientError(
                    ERROR_MESSAGES.NETWORK,
                    'NO_GAS_RUNTIME'
                ));
                return;
            }

            // Set up success handler
            const successHandler = (response: APIResponse<T> | string) => {
                // Handle string responses (legacy format)
                if (typeof response === 'string') {
                    try {
                        const parsed = JSON.parse(response) as APIResponse<T>;
                        if (parsed.status === 'success' && parsed.data !== undefined) {
                            resolve(parsed.data);
                        } else {
                            reject(new APIClientError(
                                parsed.message || ERROR_MESSAGES.UNKNOWN,
                                'API_ERROR'
                            ));
                        }
                    } catch (e) {
                        reject(new APIClientError(
                            ERROR_MESSAGES.UNKNOWN,
                            'PARSE_ERROR',
                            e
                        ));
                    }
                    return;
                }

                // Handle object responses
                if (response.status === 'success' && response.data !== undefined) {
                    resolve(response.data);
                } else {
                    reject(new APIClientError(
                        response.message || ERROR_MESSAGES.UNKNOWN,
                        'API_ERROR'
                    ));
                }
            };

            // Set up failure handler
            const failureHandler = (error: Error | string) => {
                const errorMessage = typeof error === 'string' ? error : error.message;
                reject(new APIClientError(
                    errorMessage || ERROR_MESSAGES.NETWORK,
                    'GAS_ERROR',
                    error
                ));
            };

            // Call the GAS function
            const runner = (google.script.run as any)
                .withSuccessHandler(successHandler)
                .withFailureHandler(failureHandler);

            // Execute the method
            if (typeof runner[methodName] === 'function') {
                runner[methodName](...args);
            } else {
                reject(new APIClientError(
                    `Method ${methodName} not found`,
                    'METHOD_NOT_FOUND'
                ));
            }
        } catch (error) {
            reject(new APIClientError(
                ERROR_MESSAGES.UNKNOWN,
                'UNEXPECTED_ERROR',
                error
            ));
        }
    });
}

/**
 * Check if running in development mode
 */
export function isDevMode(): boolean {
    return isDevelopment;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof APIClientError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return ERROR_MESSAGES.UNKNOWN;
}
