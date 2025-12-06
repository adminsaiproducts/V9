/**
 * SFA - 商談 (Deal) API
 *
 * シンプルな商談管理API
 * ITリテラシーの低いユーザーでも使いやすいように最小限の項目で運用
 */

import { callGAS, isDevMode } from './client';
import type {
    Deal,
    DealStage,
    CreateDealInput,
    PaginatedDealsResponse,
    PipelineSummary,
    Temple,
    Area,
    DEAL_STAGE_INFO,
} from './types';

// ============================================
// Mock Data (開発用)
// ============================================

const mockDeals: Deal[] = [
    {
        id: 'DEAL-001',
        customerName: '山田太郎',
        customerPhone: '03-1234-5678',
        templeName: '横浜令和の杜',
        area: '神奈川',
        planName: '樹木墓Aプラン',
        amount: 500000,
        stage: 'VISITED',
        source: 'WEB',
        assignedTo: '田中',
        inquiryDate: '2025-11-01',
        visitDate: '2025-11-15',
        notes: '見学後、前向きに検討中',
        nextAction: '1週間後に電話フォロー',
        createdAt: '2025-11-01T10:00:00Z',
        updatedAt: '2025-11-15T15:00:00Z',
    },
    {
        id: 'DEAL-002',
        customerName: '佐藤花子',
        customerPhone: '090-1111-2222',
        templeName: '金沢八景令和の杜',
        area: '神奈川',
        planName: '樹木墓Bプラン',
        amount: 800000,
        stage: 'NEGOTIATING',
        source: 'REFERRAL',
        assignedTo: '鈴木',
        inquiryDate: '2025-10-15',
        visitDate: '2025-10-25',
        expectedCloseDate: '2025-12-15',
        notes: '姉の紹介。契約意思固い',
        createdAt: '2025-10-15T09:00:00Z',
        updatedAt: '2025-11-20T11:00:00Z',
    },
    {
        id: 'DEAL-003',
        customerName: '鈴木次郎',
        templeName: '池上の杜',
        area: '東京',
        amount: 350000,
        stage: 'INQUIRY',
        source: 'PHONE',
        assignedTo: '田中',
        inquiryDate: '2025-12-01',
        notes: '資料請求',
        createdAt: '2025-12-01T14:00:00Z',
        updatedAt: '2025-12-01T14:00:00Z',
    },
];

const mockTemples: Temple[] = [
    { id: 'T001', name: '横浜令和の杜', area: '神奈川', isActive: true },
    { id: 'T002', name: '金沢八景令和の杜', area: '神奈川', isActive: true },
    { id: 'T003', name: '新横浜令和の杜', area: '神奈川', isActive: true },
    { id: 'T004', name: '池上の杜', area: '東京', isActive: true },
    { id: 'T005', name: '青葉台の杜', area: '東京', isActive: true },
    { id: 'T006', name: '龍口の杜', area: '神奈川', isActive: true },
    { id: 'T007', name: '新座令和の杜', area: '埼玉', isActive: true },
    { id: 'T008', name: '朝霞令和の杜', area: '埼玉', isActive: true },
    { id: 'T009', name: '大多喜令和の杜', area: '千葉', isActive: true },
];

// ============================================
// 商談 API
// ============================================

/**
 * 商談一覧を取得
 */
export async function getDeals(options?: {
    stage?: DealStage[];
    area?: Area[];
    assignedTo?: string;
    page?: number;
    pageSize?: number;
}): Promise<PaginatedDealsResponse> {
    if (isDevMode()) {
        let filtered = [...mockDeals];

        if (options?.stage?.length) {
            filtered = filtered.filter(d => options.stage!.includes(d.stage));
        }
        if (options?.area?.length) {
            filtered = filtered.filter(d => options.area!.includes(d.area));
        }
        if (options?.assignedTo) {
            filtered = filtered.filter(d => d.assignedTo === options.assignedTo);
        }

        const page = options?.page ?? 0;
        const pageSize = options?.pageSize ?? 50;
        const start = page * pageSize;

        return {
            data: filtered.slice(start, start + pageSize),
            total: filtered.length,
            page,
            pageSize,
        };
    }

    return callGAS<PaginatedDealsResponse>('api_getDeals', options);
}

/**
 * 商談詳細を取得
 */
export async function getDeal(dealId: string): Promise<Deal | null> {
    if (isDevMode()) {
        return mockDeals.find(d => d.id === dealId) || null;
    }
    return callGAS<Deal | null>('api_getDeal', dealId);
}

/**
 * 商談を作成
 */
export async function createDeal(data: CreateDealInput): Promise<Deal> {
    if (isDevMode()) {
        const now = new Date().toISOString();
        const newDeal: Deal = {
            id: `DEAL-${Date.now()}`,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail,
            customerId: data.customerId,
            templeName: data.templeName,
            area: data.area || 'その他',
            planName: data.planName,
            amount: data.amount,
            stage: 'INQUIRY',
            source: data.source,
            assignedTo: data.assignedTo,
            inquiryDate: now.split('T')[0],
            notes: data.notes,
            createdAt: now,
            updatedAt: now,
        };
        mockDeals.unshift(newDeal);
        return newDeal;
    }
    return callGAS<Deal>('api_createDeal', data);
}

/**
 * 商談を更新
 */
export async function updateDeal(dealId: string, data: Partial<Deal>): Promise<Deal> {
    if (isDevMode()) {
        const index = mockDeals.findIndex(d => d.id === dealId);
        if (index === -1) throw new Error('Deal not found');

        const updated = {
            ...mockDeals[index],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        mockDeals[index] = updated;
        return updated;
    }
    return callGAS<Deal>('api_updateDeal', dealId, data);
}

/**
 * 商談のステージを変更
 * ステージ変更時に自動で日付を更新
 */
export async function updateDealStage(
    dealId: string,
    newStage: DealStage,
    notes?: string
): Promise<Deal> {
    if (isDevMode()) {
        const index = mockDeals.findIndex(d => d.id === dealId);
        if (index === -1) throw new Error('Deal not found');

        const now = new Date().toISOString();
        const updates: Partial<Deal> = {
            stage: newStage,
            updatedAt: now,
        };

        // ステージに応じて日付を自動設定
        if (newStage === 'VISITED' && !mockDeals[index].visitDate) {
            updates.visitDate = now.split('T')[0];
        }

        if (notes) {
            updates.notes = (mockDeals[index].notes || '') + '\n' + notes;
        }

        mockDeals[index] = { ...mockDeals[index], ...updates };
        return mockDeals[index];
    }
    return callGAS<Deal>('api_updateDealStage', dealId, newStage, notes);
}

/**
 * 商談を削除（論理削除）
 */
export async function deleteDeal(dealId: string): Promise<void> {
    if (isDevMode()) {
        const index = mockDeals.findIndex(d => d.id === dealId);
        if (index !== -1) {
            mockDeals.splice(index, 1);
        }
        return;
    }
    return callGAS<void>('api_deleteDeal', dealId);
}

// ============================================
// パイプライン・ダッシュボード API
// ============================================

/**
 * パイプラインサマリーを取得（ダッシュボード用）
 */
export async function getPipelineSummary(options?: {
    area?: Area[];
    assignedTo?: string;
}): Promise<PipelineSummary> {
    if (isDevMode()) {
        let filtered = [...mockDeals];

        if (options?.area?.length) {
            filtered = filtered.filter(d => options.area!.includes(d.area));
        }
        if (options?.assignedTo) {
            filtered = filtered.filter(d => d.assignedTo === options.assignedTo);
        }

        // ステージ別集計
        const stageMap = new Map<DealStage, { count: number; totalAmount: number }>();
        const stages: DealStage[] = ['INQUIRY', 'CONTACTED', 'VISITED', 'NEGOTIATING', 'WON', 'LOST'];

        for (const stage of stages) {
            stageMap.set(stage, { count: 0, totalAmount: 0 });
        }

        let totalAmount = 0;
        let expectedAmount = 0;
        const probabilities: Record<DealStage, number> = {
            INQUIRY: 10,
            CONTACTED: 30,
            VISITED: 50,
            NEGOTIATING: 70,
            WON: 100,
            LOST: 0,
        };

        for (const deal of filtered) {
            const stageData = stageMap.get(deal.stage);
            if (stageData) {
                stageData.count++;
                stageData.totalAmount += deal.amount || 0;
            }
            totalAmount += deal.amount || 0;
            expectedAmount += (deal.amount || 0) * (probabilities[deal.stage] / 100);
        }

        // 今月のデータ
        const thisMonth = new Date().toISOString().slice(0, 7);
        const thisMonthDeals = filtered.filter(d => d.createdAt.startsWith(thisMonth));
        const thisMonthWon = filtered.filter(d => d.stage === 'WON' && d.updatedAt.startsWith(thisMonth));

        const stageLabels: Record<DealStage, string> = {
            INQUIRY: '問い合わせ',
            CONTACTED: '連絡済み',
            VISITED: '見学済み',
            NEGOTIATING: '商談中',
            WON: '成約',
            LOST: '失注',
        };

        return {
            byStage: stages.map(stage => ({
                stage,
                label: stageLabels[stage],
                count: stageMap.get(stage)!.count,
                totalAmount: stageMap.get(stage)!.totalAmount,
            })),
            totalDeals: filtered.length,
            totalAmount,
            expectedAmount,
            thisMonth: {
                newDeals: thisMonthDeals.length,
                wonDeals: thisMonthWon.length,
                wonAmount: thisMonthWon.reduce((sum, d) => sum + (d.amount || 0), 0),
            },
        };
    }
    return callGAS<PipelineSummary>('api_getPipelineSummary', options);
}

// ============================================
// 寺院マスタ API
// ============================================

/**
 * 寺院一覧を取得
 */
export async function getTemples(): Promise<Temple[]> {
    if (isDevMode()) {
        return mockTemples;
    }
    return callGAS<Temple[]>('api_getTemples');
}

/**
 * エリアから寺院を取得
 */
export async function getTemplesByArea(area: Area): Promise<Temple[]> {
    if (isDevMode()) {
        return mockTemples.filter(t => t.area === area && t.isActive);
    }
    return callGAS<Temple[]>('api_getTemplesByArea', area);
}

// ============================================
// ユーティリティ
// ============================================

/**
 * 金額をフォーマット（日本円）
 */
export function formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '-';
    return `¥${amount.toLocaleString()}`;
}

/**
 * 日付をフォーマット（日本語）
 */
export function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Export all deal API methods
 */
export const dealsAPI = {
    getDeals,
    getDeal,
    createDeal,
    updateDeal,
    updateDealStage,
    deleteDeal,
    getPipelineSummary,
    getTemples,
    getTemplesByArea,
    formatAmount,
    formatDate,
};
