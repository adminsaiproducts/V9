/**
 * Firestore Schema Definitions for CRM V9
 * Single Source of Truth compliant with Project Manifest
 */

// Base interface for all Firestore documents
export interface FirestoreDocument {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 寺院マスタ (Temples)
// 拠点ではなく「寺院・エリア・宗派」で管理
export interface Temple extends FirestoreDocument {
  name: string;
  area: string;
  sect: string; // 宗派
  address?: string;
  phone?: string;
  chiefPriest?: string; // 住職名
  notes?: string;
}

// 顧客 (Customers)
// GenieeCRMからの移行データ。法人・個人区分、住所分割、関係性を含む。
export interface Customer extends FirestoreDocument {
  // 基本情報
  name: string;
  nameKana?: string;
  type: 'CORPORATION' | 'INDIVIDUAL'; // 法人 | 個人

  // 連絡先
  phone?: string;
  mobile?: string;
  email?: string;

  // 住所 (構造化)
  address: {
    postalCode?: string;
    prefecture: string; // 都道府県
    city: string;       // 市区町村
    town: string;       // 町域・番地
    building?: string;  // 建物名・部屋番号
  };

  // 関係性情報
  // 備考欄や同一住所からの推論、または明示的な関係性
  relationships: {
    relatedCustomerId: string; // 相手先顧客ID
    relationType: string;      // 関係性 (e.g., "家族", "紹介", "同一住所")
    description?: string;      // 詳細
  }[];

  // メタデータ
  originalId?: string; // 移行元のID (GenieeCRM ID)
  notes?: string;      // 備考
}

// 関係性マスタ (RelationshipTypes)
// 顧客間の関係性定義 (from CRM_V7_Database - RelationshipTypes.csv)
export interface RelationshipType extends FirestoreDocument {
  kanCode: string; // KANコード (e.g., KAN1001)
  name: string;    // 関係性名 (e.g., 配偶者)
  category: string; // カテゴリ (e.g., 家族関係)
  inverseKanCode: string; // 逆関係KANコード
  minThreshold?: number;
  recommendedThreshold?: number;
  autoApproveThreshold?: number;
  description?: string;
  order: number; // 表示順
  isActive: boolean; // 有効フラグ
}

// 売上分類 (TransactionCategories)
// 大分類・小分類の階層構造
export interface TransactionCategory extends FirestoreDocument {
  majorCategory: string; // 大分類
  minorCategory: string; // 小分類
  description?: string;
}

// 契約 (Deals)
// 顧客とは分離し、入金予定・実績を管理
export interface Deal extends FirestoreDocument {
  customerId: string; // Reference to Customers (契約者)
  templeId: string; // Reference to Temples
  transactionCategoryId: string; // Reference to TransactionCategories
  title: string; // 案件名
  amount: number; // 金額
  expectedDate: string; // 入金予定日 (ISO 8601 Date string)
  actualDate?: string; // 入金実績日 (ISO 8601 Date string)
  status: 'PROSPECT' | 'NEGOTIATION' | 'CONTRACTED' | 'PAID' | 'CANCELLED';
  probability?: number; // 受注確度 (0-100)
  notes?: string;
}

// 監査ログ (AuditLogs)
// DOD要件: Every write operation logs to AuditLogs
export interface AuditLog extends FirestoreDocument {
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  collection: string;
  documentId: string;
  userId: string; // Executing user (email or ID)
  timestamp: string; // ISO 8601
  details: Record<string, unknown>; // Changed fields or relevant data
  userAgent?: string;
}

// AI Cache
// APIリソース戦略: 同一のAIプロンプトに対する応答はFirestoreにキャッシュ
export interface AICache extends FirestoreDocument {
  promptHash: string; // Hash of the prompt for fast lookup
  prompt: string;
  response: string;
  model: string;
  expiresAt: string; // ISO 8601
}