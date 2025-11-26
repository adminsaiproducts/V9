/**
 * Wrapper for google.script.run to support Promises and local development mocking.
 */

export interface ApiResult<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

// Define types for our entities (synced with src/types/firestore.ts)
export interface Customer {
  id: string;
  name: string;
  nameKana?: string;
  gender?: string;
  type: 'CORPORATION' | 'INDIVIDUAL';
  phone?: string;
  mobile?: string;
  email?: string;
  address?: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    building?: string;
  };
  relationships?: {
    relatedCustomerId: string;
    relationType: string;
    description?: string;
  }[];
  originalId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerInput {
  name: string;
  nameKana?: string;
  gender?: string;
  type: 'CORPORATION' | 'INDIVIDUAL';
  phone?: string;
  mobile?: string;
  email?: string;
  address?: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    building?: string;
  };
  notes?: string;
}

/**
 * Helper function to call GAS API functions
 */
function callGasApi<T>(functionName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google && window.google.script) {
      // Production: use google.script.run
      window.google.script.run
        .withSuccessHandler((result: string) => {
          try {
            const parsed = JSON.parse(result);
            if (parsed.status === 'success') {
              resolve(parsed.data);
            } else {
              reject(new Error(parsed.message || 'API call failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse API response'));
          }
        })
        .withFailureHandler((error: Error) => {
          reject(error);
        })
      [functionName](...args);
    } else {
      // Development: mock data
      console.warn(`Mock API call: ${functionName}`, args);
      setTimeout(() => {
        resolve([] as any);
      }, 500);
    }
  });
}

/**
 * API object with all available functions
 */
export const api = {
  /**
   * Get a customer by ID
   */
  getCustomer: async (id: string): Promise<Customer> => {
    return callGasApi('api_getCustomer', id);
  },

  /**
   * Search customers by query string
   */
  searchCustomers: async (query: string): Promise<Customer[]> => {
    return callGasApi('api_searchCustomers', query);
  },

  /**
   * Create a new customer
   */
  createCustomer: async (data: CustomerInput): Promise<Customer> => {
    return callGasApi('api_createCustomer', data);
  },

  /**
   * Update an existing customer
   */
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    return callGasApi('api_updateCustomer', id, data);
  },

  /**
   * Delete a customer (logical delete)
   */
  deleteCustomer: async (id: string): Promise<void> => {
    return callGasApi('api_deleteCustomer', id);
  },
};

// Type definition for google.script.run
declare global {
  interface Window {
    google: {
      script: {
        run: {
          withSuccessHandler: (handler: (result: any) => void) => any;
          withFailureHandler: (handler: (error: Error) => void) => any;
          [key: string]: any;
        };
      };
    };
    addLog?: (msg: string) => void;
  }
}