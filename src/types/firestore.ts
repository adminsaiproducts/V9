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
  furigana?: string; // フリガナ
  address?: string;
  phone?: string;
  chiefPriest?: string; // 住職名
  notes?: string;
}

// 住所構造 (Address)
export interface CustomerAddress {
  postalCode?: string;    // 郵便番号
  prefecture?: string;    // 都道府県
  city?: string;          // 市区
  town?: string;          // 町村 + 番地
  building?: string;      // 建物名
}

// 典礼責任者 (Memorial/Funeral Contact)
export interface MemorialContact {
  name?: string;          // 典礼責任者
  relationship?: string;  // 典礼責任者続柄
  postalCode?: string;    // 典礼責任者郵便番号
  address?: string;       // 典礼責任者住所
  phone?: string;         // 典礼責任者電話番号
  mobile?: string;        // 典礼責任者携帯番号
  email?: string;         // 典礼責任者e-mail
}

// 使用者変更情報 (User Change Info)
export interface UserChangeInfo {
  hasChanged?: boolean;       // 使用者変更
  reason?: string;            // 使用者変更「その他」の理由
  previousUserName?: string;  // 旧使用者氏名
  relationshipToNew?: string; // 新使用者との続柄
}

// 顧客ニーズ・嗜好 (Customer Needs/Preferences)
export interface CustomerNeeds {
  transportation?: string;    // 交通手段（車、電車、バス）、最寄り駅、拠点までの所要時間
  searchReason?: string;      // お探しの理由
  familyStructure?: string;   // 家族構成
  religiousSect?: string;     // 宗旨・宗派
  preferredPlan?: string;     // 希望プラン
  burialPlannedCount?: string;// 埋葬予定人数
  purchaseTiming?: string;    // お墓の購入時期
  appealPoints?: string;      // 気に入っていただけた点
  appealPointsOther?: string; // 上で「その他」だった内容
  concerns?: string;          // お墓について気になること
  otherConsultation?: string; // その他のご相談
}

// 関係性情報
export interface CustomerRelationship {
  relatedCustomerId: string;  // 相手先顧客ID
  relationType: string;       // 関係性 (e.g., "家族", "紹介", "同一住所")
  description?: string;       // 詳細
}

// 顧客 (Customers)
// GenieeCRMからの移行データ。法人・個人区分、住所分割、関係性を含む。
// Based on GENIEE CRM CSV structure (52 columns)
export interface Customer extends FirestoreDocument {
  // === 識別情報 ===
  recordId?: string;        // レコードID (GENIEE ID)
  trackingNo?: string;      // 追客NO
  parentChildFlag?: string; // 親子フラグ
  branch?: string;          // 拠点

  // === 基本情報 ===
  name: string;             // 使用者名
  nameKana?: string;        // 使用者名（フリガナ）
  type?: 'CORPORATION' | 'INDIVIDUAL'; // 法人 | 個人
  gender?: string;          // 性別
  age?: number;             // 年齢

  // === 連絡先 ===
  phone?: string;           // 電話番号
  mobile?: string;          // 携帯番号
  email?: string;           // e-mail

  // === 住所 (構造化) ===
  address?: CustomerAddress;

  // === CRM管理情報 ===
  notes?: string;                   // 備考
  visitRoute?: string;              // 来寺経緯
  otherCompanyReferralDate?: string;// 他社紹介日
  receptionist?: string;            // 受付担当
  doNotContact?: boolean;           // 営業活動不可
  crossSellTarget?: boolean;        // クロスセル対象

  // === 典礼責任者 ===
  memorialContact?: MemorialContact;

  // === 使用者変更 ===
  userChangeInfo?: UserChangeInfo;

  // === 活動・商談 ===
  activityCount?: number;   // 活動履歴件数
  dealCount?: number;       // 商談件数

  // === ニーズ・嗜好 ===
  needs?: CustomerNeeds;

  // === 関係性 ===
  relationships?: CustomerRelationship[];

  // === システム情報 ===
  originalId?: string;        // 移行元のID (GenieeCRM ID)
  role?: string;              // ロール
  lastActivityDate?: string;  // 最終活動日時
  lastTransactionDate?: string; // 最終取引日

  // === 削除フラグ ===
  deletedAt?: string;         // 論理削除日時
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

// 担当者マスタ (Staff)
// Google Admin / GENIEE CRMから移行したスタッフ情報
export interface Staff extends FirestoreDocument {
  name: string;           // 担当者名
  email?: string;         // メールアドレス
  role?: string;          // 役割 (sales, manager, admin等)
  isActive: boolean;      // 有効フラグ
  branch?: string;        // 所属拠点
  phone?: string;         // 内線番号等
  notes?: string;         // 備考
}

// 商品マスタ (Products)
// 各寺院の商品・料金情報
export interface Product extends FirestoreDocument {
  templeId?: string;      // Reference to Temples
  templeName: string;     // 寺院名
  category: string;       // カテゴリ (旧区画, 新区画等)
  planName: string;       // プラン名
  stoneType?: string;     // 石種
  // 価格情報
  platePrice?: number | null;        // プレート代
  engravingPrice?: number | null;    // 彫刻代
  boneContainerPrice?: number | null;// 骨壺代
  boneHandlingFee?: number | null;   // 骨上げ代
  bonePickupFee?: number | null;     // お骨引き取り代
  boneProcessingFee?: number | null; // 粉骨加工代
  dryingFee?: number | null;         // 乾燥代
  notes?: string;         // 備考
  isActive: boolean;      // 有効フラグ
}