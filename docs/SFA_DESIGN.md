# CRM V9 SFA (Sales Force Automation) 設計書

## 1. 現状分析

### 1.1 現在の管理方法

**売上管理表（data/sales/）**
- 契約詳細: 連番, 契約日, 顧客名, 寺院名, エリア, 契約金額, 入金日×3, 入金額×3, 入金合計, 残高, 小分類, 大分類, 備考, 工事完了, 引渡日, 売上計上月
- 寺院マスタ: 墓所, エリア, フリガナ, 宗派
- 売上分類マスタ: 小分類, 大分類

**ヨミ表・リード表（data/pipeline/）**
- 拠点別管理: ふうがく, 広尾, 新横浜, 谷中, 池上, 町田, 龍口
- 確度区分: A確実（契約確実）, B確実（申込見込み）, C確実（検討中）, D（長期フォロー）, 問い合わせ（新規）
- 管理項目: 顧客名, プラン, 金額, 流入経路, 拠点/墓地区画, 問い合わせ日, 資料送付日, 顧客メール, 顧客TEL, 見学, 見学フォローアップ, 仮申込, 申込

### 1.2 課題

1. **データの分散**: 売上とパイプラインが別々のスプレッドシートで管理
2. **顧客データとの非連携**: 顧客マスタと売上/パイプラインデータが紐付いていない
3. **レポート作成の手間**: 月次/四半期の集計が手動
4. **確度の一貫性欠如**: 拠点ごとに微妙に異なる運用

---

## 2. SFA データモデル設計

### 2.1 Firestore コレクション構造

```
/deals (商談コレクション)
  ├── {dealId}
  │   ├── customerId: string (顧客への参照)
  │   ├── customerName: string (表示用キャッシュ)
  │   ├── templeId: string (寺院への参照)
  │   ├── templeName: string (表示用キャッシュ)
  │   ├── area: string (エリア)
  │   ├── planType: string (プラン種別)
  │   ├── planDetails: string (プラン詳細)
  │   ├── amount: number (契約金額)
  │   ├── stage: string (商談ステージ)
  │   ├── probability: number (確度 0-100%)
  │   ├── source: string (流入経路)
  │   ├── assignedTo: string (担当者)
  │   ├── plotInfo: string (区画情報)
  │   ├── notes: string (備考)
  │   │
  │   ├── timeline (商談タイムライン)
  │   │   ├── inquiryDate: timestamp (問い合わせ日)
  │   │   ├── documentSentDate: timestamp (資料送付日)
  │   │   ├── visitDate: timestamp (見学日)
  │   │   ├── visitFollowUpDate: timestamp (見学フォロー日)
  │   │   ├── tentativeApplicationDate: timestamp (仮申込日)
  │   │   ├── applicationDate: timestamp (申込日)
  │   │   ├── contractDate: timestamp (契約日)
  │   │   ├── deliveryDate: timestamp (引渡日)
  │   │   └── constructionCompleteDate: timestamp (工事完了日)
  │   │
  │   ├── expectedCloseDate: timestamp (成約予定日)
  │   ├── actualCloseDate: timestamp (実際の成約日)
  │   ├── lostReason: string (失注理由)
  │   │
  │   ├── createdAt: timestamp
  │   ├── updatedAt: timestamp
  │   └── createdBy: string
  │
  └── /activities (商談活動サブコレクション)
      └── {activityId}
          ├── type: string (電話/メール/訪問/SMS等)
          ├── date: timestamp
          ├── description: string
          ├── outcome: string
          └── nextAction: string

/contracts (契約コレクション - 成約後)
  └── {contractId}
      ├── dealId: string (元商談への参照)
      ├── customerId: string
      ├── customerName: string
      ├── templeId: string
      ├── templeName: string
      ├── area: string
      ├── contractDate: timestamp (契約日)
      ├── amount: number (契約金額)
      ├── category: string (売上分類 - 小分類)
      ├── categoryMain: string (売上分類 - 大分類)
      │
      ├── payments (入金情報)
      │   ├── payment1: { date: timestamp, amount: number }
      │   ├── payment2: { date: timestamp, amount: number }
      │   └── payment3: { date: timestamp, amount: number }
      │
      ├── totalPaid: number (入金合計)
      ├── balance: number (残高)
      ├── accountingMonth: string (売上計上月 "2025年01月")
      ├── deliveryDate: timestamp (引渡日)
      ├── constructionCompleteDate: timestamp (工事完了日)
      ├── notes: string
      │
      ├── createdAt: timestamp
      └── updatedAt: timestamp

/temples (寺院マスタ)
  └── {templeId}
      ├── name: string (墓所名)
      ├── nameKana: string (フリガナ)
      ├── area: string (エリア: 東京/神奈川/埼玉/千葉)
      ├── sect: string (宗派)
      ├── type: string (墓地タイプ: 樹木葬/ペット墓/一般墓地等)
      ├── address: object
      ├── contact: object
      └── isActive: boolean

/salesCategories (売上分類マスタ)
  └── {categoryId}
      ├── name: string (小分類)
      ├── mainCategory: string (大分類)
      └── sortOrder: number

/pipelineStages (パイプラインステージマスタ)
  └── {stageId}
      ├── name: string
      ├── code: string
      ├── probability: number (デフォルト確度)
      ├── sortOrder: number
      └── isActive: boolean
```

### 2.2 商談ステージ定義

| コード | ステージ名 | 確度 | 説明 |
|--------|-----------|------|------|
| INQUIRY | 問い合わせ | 10% | 初回コンタクト、資料請求 |
| DOCUMENT_SENT | 資料送付済 | 20% | 資料送付完了 |
| VISIT_SCHEDULED | 見学予定 | 30% | 見学日程調整中 |
| VISITED | 見学済 | 40% | 見学実施済み |
| FOLLOW_UP | フォローアップ | 50% | 見学後のフォロー中 |
| A_RANK | A確実 | 80% | 契約確実、申込手続き中 |
| B_RANK | B確実 | 60% | 申込見込み高い |
| C_RANK | C確実 | 40% | 検討中、継続フォロー |
| TENTATIVE | 仮申込 | 70% | 仮申込済み |
| APPLICATION | 申込 | 90% | 正式申込済み |
| WON | 成約 | 100% | 契約完了 |
| LOST | 失注 | 0% | 失注・キャンセル |
| LONG_TERM | 長期フォロー | 20% | 長期的にフォロー継続 |

### 2.3 流入経路マスタ

| コード | 名称 |
|--------|------|
| WEB | WEBサイト |
| PHONE | 電話問い合わせ |
| POSTER | ポスター |
| LEAFLET | リーフレット |
| TOWN_NEWS | タウンニュース |
| POSTCARD | ポスティング |
| LIFEDOT | ライフドット |
| NEWSPAPER | 新聞広告 |
| REFERRAL | 紹介 |
| WALK_IN | 来院 |
| EXHIBITION | 相談会・展示会 |
| OTHER | その他 |

---

## 3. API 設計

### 3.1 商談 API

```typescript
// 商談一覧取得（パイプライン表示用）
api_getDeals(options: {
  stage?: string[];       // ステージでフィルタ
  area?: string[];        // エリアでフィルタ
  templeId?: string;      // 寺院でフィルタ
  assignedTo?: string;    // 担当者でフィルタ
  dateFrom?: string;      // 期間（開始）
  dateTo?: string;        // 期間（終了）
  page?: number;
  pageSize?: number;
}): Promise<PaginatedDealsResponse>

// 商談詳細取得
api_getDeal(dealId: string): Promise<Deal>

// 商談作成
api_createDeal(data: CreateDealInput): Promise<Deal>

// 商談更新
api_updateDeal(dealId: string, data: UpdateDealInput): Promise<Deal>

// ステージ変更（履歴付き）
api_updateDealStage(dealId: string, newStage: string, notes?: string): Promise<Deal>

// 商談を成約に変換
api_convertDealToContract(dealId: string, contractData: ContractInput): Promise<Contract>

// 商談活動追加
api_addDealActivity(dealId: string, activity: ActivityInput): Promise<Activity>
```

### 3.2 契約 API

```typescript
// 契約一覧取得
api_getContracts(options: {
  area?: string[];
  templeId?: string;
  category?: string;
  accountingMonth?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedContractsResponse>

// 契約詳細取得
api_getContract(contractId: string): Promise<Contract>

// 契約作成（直接契約入力用）
api_createContract(data: CreateContractInput): Promise<Contract>

// 契約更新
api_updateContract(contractId: string, data: UpdateContractInput): Promise<Contract>

// 入金登録
api_recordPayment(contractId: string, payment: PaymentInput): Promise<Contract>
```

### 3.3 レポート API

```typescript
// パイプラインサマリー（ダッシュボード用）
api_getPipelineSummary(options: {
  area?: string[];
  templeId?: string;
  assignedTo?: string;
}): Promise<PipelineSummary>

// 売上予測（月次/四半期）
api_getSalesForecast(options: {
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  quarter?: number;
  area?: string[];
}): Promise<SalesForecast>

// 売上実績
api_getSalesActual(options: {
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;
  area?: string[];
  category?: string;
}): Promise<SalesActual>

// 目標対比レポート
api_getTargetComparison(options: {
  year: number;
  quarter?: number;
  area?: string[];
}): Promise<TargetComparison>

// 担当者別実績
api_getSalesByAssignee(options: {
  year: number;
  month?: number;
}): Promise<SalesByAssignee[]>

// 寺院別実績
api_getSalesByTemple(options: {
  year: number;
  month?: number;
}): Promise<SalesByTemple[]>
```

---

## 4. フロントエンド設計

### 4.1 画面構成

```
/sfa
  ├── /pipeline          # パイプライン（カンバン形式）
  │   ├── フィルター（エリア/寺院/担当者/期間）
  │   ├── ステージ別カード表示
  │   └── ドラッグ&ドロップでステージ変更
  │
  ├── /deals             # 商談一覧（テーブル形式）
  │   ├── 検索・フィルター
  │   ├── ソート
  │   └── ページネーション
  │
  ├── /deals/:id         # 商談詳細
  │   ├── 基本情報
  │   ├── タイムライン
  │   ├── 活動履歴
  │   └── 関連顧客情報
  │
  ├── /contracts         # 契約一覧
  │   ├── 検索・フィルター
  │   ├── 入金状況
  │   └── CSVエクスポート
  │
  ├── /contracts/:id     # 契約詳細
  │   ├── 契約情報
  │   └── 入金管理
  │
  └── /dashboard         # SFAダッシュボード
      ├── パイプライン金額サマリー
      ├── 月次売上グラフ
      ├── 目標達成率
      ├── 今月の成約予定
      └── 要アクション商談
```

### 4.2 ダッシュボード要件

**経営陣向け指標（売上見込み管理）**

1. **パイプライン金額**
   - ステージ別の総額
   - 確度加重金額（金額 × 確度%）
   - 前月比較

2. **売上予測**
   - 当月予測（確度80%以上の商談合計）
   - 四半期予測
   - 年間予測

3. **目標達成率**
   - 月次目標 vs 実績
   - 四半期目標 vs 実績（予測含む）
   - 前年同期比

4. **エリア別・寺院別分析**
   - パフォーマンス比較
   - 成長率

5. **アクション必要商談**
   - 長期間ステージ変化なし
   - フォローアップ期限超過
   - 成約予定日が近い

---

## 5. 顧客データとの連携

### 5.1 紐付けルール

1. **商談作成時**
   - 顧客IDで直接紐付け
   - 顧客名・電話・メールから既存顧客を検索して紐付け
   - 新規顧客の場合は顧客マスタも同時作成

2. **契約作成時**
   - 商談の顧客IDを継承
   - 顧客マスタに契約履歴を追加

3. **顧客詳細画面での表示**
   - 関連商談一覧
   - 関連契約一覧
   - 総購入金額

### 5.2 重複チェック

商談・契約作成時に既存データとの重複をチェック：
- 同一顧客・同一寺院・近い日付の商談があれば警告
- 既に契約済みの組み合わせは注意表示

---

## 6. マイグレーション計画

### 6.0 インポートデータの準備状況 (2025-12-04)

**✅ 完了済み - 正式データファイル生成**

すべてのマスタデータは `migration/output/gas-scripts/` に正式スキーマで生成済みです。

| ファイル | 件数 | 状態 |
|---------|------|------|
| `firestore-customers.json` | 10,852件 | ✅ 生成済み |
| `firestore-temples.json` | 63件 | ✅ 生成済み |
| `firestore-staff.json` | 57件 | ✅ 生成済み |
| `firestore-products.json` | 66件 | ✅ 生成済み |
| `firestore-deals.json` | 3,651件 | ✅ 生成済み（37バッチ） |

**⚠️ 重要: Single Source of Truth**
- インポートデータは `migration/output/gas-scripts/` のみを使用
- `data/import/` は作業用一時ファイル（正式データではない）
- スキーマは `src/types/firestore.ts` に定義

**次のステップ**
1. Google DriveにJSONファイルをアップロード
2. `migration-master.gs` でファイルIDを設定
3. GASエディタから `runFullMigration()` を実行

### 6.1 既存データのインポート

**Phase 1: マスタデータ** ✅ データ準備完了
1. 寺院マスタ（firestore-temples.json - 63件）
2. 担当者マスタ（firestore-staff.json - 57件）
3. 商品マスタ（firestore-products.json - 66件）

**Phase 2: 契約データ** ✅ データ準備完了
1. 商談データ（firestore-deals.json - 3,651件）→ deals コレクション
2. 顧客名から顧客IDを紐付け済み

**Phase 3: パイプラインデータ**
1. 各拠点のヨミ表・リード表 → deals コレクション（将来対応）
2. 確度をステージにマッピング
3. 顧客名から顧客IDを紐付け

### 6.2 データマッピング

**売上管理表 → Contract**
| 売上管理表 | Contract |
|-----------|----------|
| 連番 | (importId) |
| 契約日 | contractDate |
| 顧客名 | customerName → customerId |
| 寺院名 | templeName → templeId |
| エリア | area |
| 契約金額 | amount |
| 入金日①〜③ | payments.payment1-3.date |
| 入金額①〜③ | payments.payment1-3.amount |
| 入金合計 | totalPaid |
| 残高 | balance |
| 小分類 | category |
| 大分類 | categoryMain |
| 備考 | notes |
| 工事完了 | constructionCompleteDate |
| 引渡日 | deliveryDate |
| 売上計上月 | accountingMonth |

**ヨミ表 → Deal**
| ヨミ表 | Deal |
|--------|------|
| 顧客名 | customerName → customerId |
| プラン | planType + planDetails |
| 金額 | amount |
| 流入経路 | source |
| 拠点/区画 | plotInfo |
| 問い合わせ日 | timeline.inquiryDate |
| 資料送付日 | timeline.documentSentDate |
| 見学日 | timeline.visitDate |
| 見学フォロー | timeline.visitFollowUpDate |
| 仮申込 | timeline.tentativeApplicationDate |
| 申込 | timeline.applicationDate |
| 確度（A/B/C/D） | stage |

---

## 7. 実装優先順位

### Phase 1: 基盤（1-2週間）
- [ ] Firestore コレクション作成
- [ ] マスタデータ投入（寺院、売上分類、ステージ）
- [ ] 基本 CRUD API

### Phase 2: 商談管理（2-3週間）
- [ ] 商談一覧・詳細画面
- [ ] 商談作成・編集
- [ ] ステージ管理
- [ ] 顧客紐付け

### Phase 3: 契約管理（1-2週間）
- [ ] 契約一覧・詳細画面
- [ ] 契約作成・編集
- [ ] 入金管理

### Phase 4: ダッシュボード（2週間）
- [ ] パイプラインサマリー
- [ ] 売上予測・実績グラフ
- [ ] 目標管理

### Phase 5: データ移行（1週間）
- [ ] 既存売上データのインポート
- [ ] 既存ヨミ表データのインポート
- [ ] 顧客との名寄せ

---

## 8. TypeScript 型定義

```typescript
// types/sfa.ts

export interface Deal {
  id: string;
  customerId?: string;
  customerName: string;
  templeId?: string;
  templeName: string;
  area: string;
  planType: string;
  planDetails?: string;
  amount: number;
  stage: DealStage;
  probability: number;
  source: LeadSource;
  assignedTo: string;
  plotInfo?: string;
  notes?: string;
  timeline: DealTimeline;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type DealStage =
  | 'INQUIRY'
  | 'DOCUMENT_SENT'
  | 'VISIT_SCHEDULED'
  | 'VISITED'
  | 'FOLLOW_UP'
  | 'A_RANK'
  | 'B_RANK'
  | 'C_RANK'
  | 'TENTATIVE'
  | 'APPLICATION'
  | 'WON'
  | 'LOST'
  | 'LONG_TERM';

export type LeadSource =
  | 'WEB'
  | 'PHONE'
  | 'POSTER'
  | 'LEAFLET'
  | 'TOWN_NEWS'
  | 'POSTCARD'
  | 'LIFEDOT'
  | 'NEWSPAPER'
  | 'REFERRAL'
  | 'WALK_IN'
  | 'EXHIBITION'
  | 'OTHER';

export interface DealTimeline {
  inquiryDate?: Date;
  documentSentDate?: Date;
  visitDate?: Date;
  visitFollowUpDate?: Date;
  tentativeApplicationDate?: Date;
  applicationDate?: Date;
  contractDate?: Date;
  deliveryDate?: Date;
  constructionCompleteDate?: Date;
}

export interface Contract {
  id: string;
  dealId?: string;
  customerId?: string;
  customerName: string;
  templeId?: string;
  templeName: string;
  area: string;
  contractDate: Date;
  amount: number;
  category: string;
  categoryMain: string;
  payments: Payment[];
  totalPaid: number;
  balance: number;
  accountingMonth: string;
  deliveryDate?: Date;
  constructionCompleteDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  date: Date;
  amount: number;
}

export interface Temple {
  id: string;
  name: string;
  nameKana: string;
  area: string;
  sect: string;
  type: string;
  isActive: boolean;
}

export interface SalesCategory {
  id: string;
  name: string;
  mainCategory: string;
  sortOrder: number;
}

export interface PipelineSummary {
  byStage: {
    stage: DealStage;
    count: number;
    totalAmount: number;
    weightedAmount: number;
  }[];
  totalDeals: number;
  totalAmount: number;
  weightedAmount: number;
}

export interface SalesForecast {
  period: string;
  target: number;
  forecast: number;
  actual: number;
  achievementRate: number;
}
```

---

## 9. 注意事項

1. **既存運用との並行期間**
   - 移行期間中は既存スプレッドシートとの二重入力を避けるため、一括移行を推奨
   - 読み取り専用でスプレッドシート参照機能を残すことも検討

2. **権限管理**
   - 契約情報は機密性が高いため、閲覧・編集権限を分ける
   - ダッシュボードは経営陣のみアクセス可能に

3. **バックアップ**
   - 契約データは定期的にエクスポートしてバックアップ
   - Firestore の自動バックアップも設定

4. **監査ログ**
   - 金額変更、ステージ変更は履歴を残す
   - 誰がいつ変更したかを追跡可能に
