/**
 * Mock customer data for development mode
 */

import type { Customer } from '../types';

/**
 * Generate mock customers
 */
export const mockCustomers: Customer[] = [
    {
        id: 'mock-001',
        name: '山田太郎',
        kana: 'ヤマダタロウ',
        phone: '03-1234-5678',
        email: 'yamada@example.com',
        address: '東京都渋谷区1-2-3',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z',
    },
    {
        id: 'mock-002',
        name: '佐藤花子',
        kana: 'サトウハナコ',
        phone: '03-2345-6789',
        email: 'sato@example.com',
        address: '東京都新宿区4-5-6',
        createdAt: '2024-01-16T10:30:00Z',
        updatedAt: '2024-01-16T10:30:00Z',
    },
    {
        id: 'mock-003',
        name: '鈴木一郎',
        kana: 'スズキイチロウ',
        phone: '03-3456-7890',
        email: 'suzuki@example.com',
        address: '東京都港区7-8-9',
        createdAt: '2024-01-17T11:00:00Z',
        updatedAt: '2024-01-17T11:00:00Z',
    },
    {
        id: 'mock-004',
        name: '田中美咲',
        kana: 'タナカミサキ',
        phone: '03-4567-8901',
        email: 'tanaka@example.com',
        address: '東京都品川区10-11-12',
        createdAt: '2024-01-18T14:00:00Z',
        updatedAt: '2024-01-18T14:00:00Z',
    },
    {
        id: 'mock-005',
        name: '高橋健太',
        kana: 'タカハシケンタ',
        phone: '03-5678-9012',
        email: 'takahashi@example.com',
        address: '東京都目黒区13-14-15',
        createdAt: '2024-01-19T15:30:00Z',
        updatedAt: '2024-01-19T15:30:00Z',
    },
    {
        id: 'mock-006',
        name: '伊藤由美',
        kana: 'イトウユミ',
        phone: '03-6789-0123',
        email: 'ito@example.com',
        address: '東京都世田谷区16-17-18',
        createdAt: '2024-01-20T09:15:00Z',
        updatedAt: '2024-01-20T09:15:00Z',
    },
    {
        id: 'mock-007',
        name: '渡辺誠',
        kana: 'ワタナベマコト',
        phone: '03-7890-1234',
        email: 'watanabe@example.com',
        address: '東京都中野区19-20-21',
        createdAt: '2024-01-21T10:45:00Z',
        updatedAt: '2024-01-21T10:45:00Z',
    },
    {
        id: 'mock-008',
        name: '中村さくら',
        kana: 'ナカムラサクラ',
        phone: '03-8901-2345',
        email: 'nakamura@example.com',
        address: '東京都杉並区22-23-24',
        createdAt: '2024-01-22T13:00:00Z',
        updatedAt: '2024-01-22T13:00:00Z',
    },
    {
        id: 'mock-009',
        name: '小林大輔',
        kana: 'コバヤシダイスケ',
        phone: '03-9012-3456',
        email: 'kobayashi@example.com',
        address: '東京都豊島区25-26-27',
        createdAt: '2024-01-23T16:20:00Z',
        updatedAt: '2024-01-23T16:20:00Z',
    },
    {
        id: 'mock-010',
        name: '加藤愛',
        kana: 'カトウアイ',
        phone: '03-0123-4567',
        email: 'kato@example.com',
        address: '東京都北区28-29-30',
        createdAt: '2024-01-24T11:30:00Z',
        updatedAt: '2024-01-24T11:30:00Z',
    },
];

/**
 * Simulate network delay
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all mock customers with simulated delay
 */
export async function getMockCustomers(): Promise<Customer[]> {
    await delay(500); // Simulate network latency
    return [...mockCustomers];
}

/**
 * Search mock customers by query
 */
export async function searchMockCustomers(query: string): Promise<Customer[]> {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return mockCustomers.filter(
        customer =>
            customer.name.toLowerCase().includes(lowerQuery) ||
            customer.kana?.toLowerCase().includes(lowerQuery) ||
            customer.email?.toLowerCase().includes(lowerQuery) ||
            customer.phone?.includes(query)
    );
}

/**
 * Get single mock customer by ID
 */
export async function getMockCustomer(id: string): Promise<Customer> {
    await delay(200);
    const customer = mockCustomers.find(c => c.id === id);
    if (!customer) {
        throw new Error('Customer not found');
    }
    return { ...customer };
}

/**
 * Create mock customer
 */
export async function createMockCustomer(data: Partial<Customer>): Promise<Customer> {
    await delay(400);
    const newCustomer: Customer = {
        id: `mock-${Date.now()}`,
        name: data.name || '',
        kana: data.kana,
        phone: data.phone,
        email: data.email,
        address: data.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    mockCustomers.push(newCustomer);
    return { ...newCustomer };
}

/**
 * Update mock customer
 */
export async function updateMockCustomer(
    id: string,
    data: Partial<Customer>
): Promise<Customer> {
    await delay(400);
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index === -1) {
        throw new Error('Customer not found');
    }
    mockCustomers[index] = {
        ...mockCustomers[index],
        ...data,
        id, // Preserve ID
        updatedAt: new Date().toISOString(),
    };
    return { ...mockCustomers[index] };
}

/**
 * Delete mock customer (soft delete)
 */
export async function deleteMockCustomer(id: string): Promise<void> {
    await delay(300);
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index === -1) {
        throw new Error('Customer not found');
    }
    mockCustomers[index].deletedAt = new Date().toISOString();
}
