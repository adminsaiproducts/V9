# CRM V9 Current Status

## プロジェクト情報

| 項目 | 値 |
| :--- | :--- |
| プロジェクト名 | CRM V9 System |
| GAS Script ID | `1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ` |
| GitHub Repository | https://github.com/adminsaiproducts/V9 |
| Firestore Database | `crm-database-v9` (GCP: `crm-appsheet-v7`) |

## GAS Script Properties

| プロパティ名 | 設定値 |
| :--- | :--- |
| `FIRESTORE_PROJECT_ID` | `crm-appsheet-v7` |
| `FIRESTORE_DATABASE_ID` | `crm-database-v9` |
| `FIRESTORE_EMAIL` | `crm-v7-automation@crm-appsheet-v7.iam.gserviceaccount.com` |
| `FIRESTORE_KEY` | `config/serviceAccount.json` の `private_key` 全文 |

## ビルドシステム構成 (3-File Pattern)

**採用戦略:** Separated Assets Pattern (GAS Size Limitation対応)

### 技術スタック
- **Frontend Build:** Vite + React + TypeScript
- **Backend Build:** Webpack + gas-webpack-plugin
- **GAS Template:** 3-File Pattern (`index.html` + `javascript.html` + `stylesheet.html`)

### ファイル構成
```
dist/
├── index.html          - GAS template with <?!= include() ?> tags
├── javascript.html     - All JS wrapped in <script> tags
├── stylesheet.html     - All CSS wrapped in <style> tags
├── bundle.js          - Backend GAS code
└── appsscript.json    - GAS manifest
```

## 完了したマイルストーン

### Phase 1: Database Setup ✅
1. **Firestore データベース作成:** `crm-database-v9` (Tokyo)
2. **データ移行 (ETL):** 10,852件 (検証完了)
3. **機能実装:** AuditLog, REST API Endpoint
4. **パフォーマンス:** 58ms/request (High Speed)

### Phase 2: Infrastructure Setup ✅
5. **Technical Debt:** Removed `any` types (Strict TypeScript Compliance)
6. **Infrastructure:** Added `AICacheService` & `scripts/setup.ts` (Zero-Touch)
7. **Build System:** Vite + Webpack ハイブリッド構成
8. **Frontend Foundation:** Vite + React + TypeScript
9. **3-File Pattern Migration:** GAS制限回避のため Separated Assets 戦略を実装
10. **Deployment Pipeline:** `npm run build` → `clasp push -f` → `clasp deploy` 自動化

### Phase 3: Real Data Connection ✅
11. **Code Consolidation:** `globalThis` 露出コードの永続化
12. **Firestore Integration:** `CustomerService` を使用した実データ取得
13. **Type Mapping:** Customer型の正しいマッピング
14. **Verification:** ブラウザで実データ表示を確認（10,852件の顧客データ）
15. **Bridge Injection:** `doPost` 実装と自動注入の完全化

### V10/V11 知見統合 ✅ (2025-12-03)
16. **教訓ドキュメント作成:** `docs/LESSONS_LEARNED_V10_V11.md`
17. **PROJECT_MANIFEST.md 更新:** V10/V11統合後の状態を反映
18. **V10/V11 アーカイブ:** GitHubにfinal stateをpush済み

### Phase 4: Customer Edit & Postal Code Features ✅ (2025-12-03)
19. **顧客更新機能:** `api_updateCustomer` GAS関数を実装
20. **GASブリッジ修正:** `scripts/add-bridge.js` にAPI関数追加
21. **郵便番号→住所変換:** 複数結果がある場合の選択UI実装
22. **住所→郵便番号検索:** HeartRails Geo APIを使用した逆引き機能
23. **整合性チェック:** 郵便番号と住所の不一致警告機能
24. **開発ガイド作成:** `docs/DEVELOPMENT_GUIDE.md` - 知見・失敗・ベストプラクティス

### Phase 5: API最適化 & 関係性機能 ✅ (2025-12-04 完了)
25. **URLFetch クォータ超過対応:**
    - 原因: GAS日次URLFetchクォータ（20,000 calls/day for Consumer）超過
    - 対策1: キャッシュシステム実装（`getCachedOrFetch`、5分TTL）
    - 対策2: ページネーション対応（`api_getCustomersPaginated`）
    - 対策3: フロントエンド楽観的更新（API呼び出し削減）
    - 教訓: クォータは17:00 JSTにリセット
26. **関係性機能UI実装:**
    - `RelationshipList.tsx` - 関係性一覧表示（編集/削除/確認ボタン）
    - `RelationshipForm.tsx` - 関係性追加/編集ダイアログ（顧客検索付き）
    - `RelationshipResolver.tsx` - 不確実な関係性の手動確認ダイアログ
27. **GAS Relationship API実装:**
    - `api_getCustomerRelationships` - 顧客の関係性取得
    - `api_createRelationship` - 関係性作成
    - `api_updateRelationship` - 関係性更新
    - `api_deleteRelationship` - 関係性削除
    - `api_resolveRelationship` - 関係性確認/却下
    - `migration_importRelationships` - 関係性一括インポート
28. **Firestore queryDocuments対応:** WHERE句によるクエリ実装
29. **関係性マスター:** `data/relationship/CRM_V7_Database - RelationshipTypes.csv`
    - 問題: Shift-JIS (CP932) エンコーディングで文字化け発生
    - 解決策: PowerShellで `[System.Text.Encoding]::GetEncoding(932)` 使用
    - 含まれるKANコード: KAN1001-KAN9999（約50種類の関係性タイプ）

### Phase 6: マスタデータ統合 & Firestoreインポート ✅ (2025-12-05 完了)
30. **インポートデータ重複問題の解消:**
    - 問題: `data/import/customers.json` と `migration/output/gas-scripts/firestore-customers.json` が競合
    - 原因: 2つの異なるスキーマで同じデータを生成していた
    - 解決: `data/import/customers.json` を削除、`firestore-customers.json` を正式データとして採用
    - 教訓: **データ生成は1か所で行い、Single Source of Truthを維持する**
31. **Firestoreスキーマ拡張:**
    - `src/types/firestore.ts` に `Staff` と `Product` インターフェースを追加
    - 担当者マスタ: name, email, role, isActive, branch, phone, notes
    - 商品マスタ: templeId, templeName, category, planName, 各種価格情報
32. **マスタデータ再生成:**
    - `migration/scripts/regenerate-migration-data.js` を作成
    - 既存の `data/import/` データを正式Firestoreスキーマに変換
    - 出力: firestore-temples.json (63件), firestore-staff.json (57件), firestore-products.json (66件), firestore-deals.json (3,651件)
33. **不要ファイルの整理:**
    - `import-customers.gs` 削除（データ埋め込み式は不適切、JSONファイル方式を採用）
    - `migration-master.gs` と `import-relationships.gs` は保持
34. **Firestoreインポート完了:** (2025-12-05)
    - `migration-master.gs` をbatchWrite API対応に最適化（500件/API呼び出し）
    - recordIdフィールド対応（Customers用）
    - 全5コレクションのインポート成功確認

### インポート完了データ（Firestore: crm-database-v9）
| コレクション | 件数 | ステータス |
|-------------|------|-----------|
| Customers | 10,852件 | ✅ 完了 |
| Temples | 63件 | ✅ 完了 |
| Staff | 57件 | ✅ 完了 |
| Products | 66件 | ✅ 完了 |
| Deals | 3,651件 | ✅ 完了 |

### Phase 7: 典礼責任者顧客データ統合 ✅ (2025-12-05 完了)
35. **典礼責任者顧客の自動生成:**
    - 入力ソース: 顧客の備考欄・関係性データから典礼責任者（寺院の連絡先）を抽出
    - M番号 (M0001〜M1766) で1,766件の顧客レコードを自動生成
    - 関係性テーブルに1,775件のリンクを作成

36. **顧客一覧のソート順修正:**
    - 問題: M番号顧客が先頭に表示され、通常顧客のフリガナ・メールが見えない
    - 解決: `sortCustomersByTrackingNo()`関数を実装、数字始まりの追客NOを優先表示

37. **典礼責任者住所データの構造問題を修正:**
    - **問題1:** 住所がオブジェクトではなくJSON文字列として保存されていた
    - **問題2:** `town`フィールドに番地・建物名まで含まれていた
      - 例: `town: "南区中里3-3-11　弘明寺パークハイツ107"` (誤)
    - **解決:** `scripts/fix-memorial-customer-addresses.js`で1,766件を一括修正
      - `town: "南区中里"`, `streetNumber: "3-3-11"`, `building: "弘明寺パークハイツ107"` (正)
    - **教訓:** 住所パース関数は正規表現で町名・番地・建物を正しく分離する必要がある

### 更新後の顧客データ統計
| データ種別 | 件数 | 備考 |
|-----------|------|------|
| 通常顧客 | 10,852件 | 数字始まりの追客NO |
| 典礼責任者顧客 | 1,766件 + 1,055件 | M番号 (M0001〜M1766) + 新規 |
| 関係性 | 1,775件 | 顧客-典礼責任者のリンク |
| **合計顧客数** | **13,673件** | |

### Phase 8: 検索最適化 & ダッシュボード機能 ✅ (2025-12-06 完了)
38. **高速検索機能の実装:**
    - **問題**: 13,673件の顧客検索に25秒以上かかり、UIがフリーズする
    - **解決策1**: `api_getAllCustomers` GAS関数で全顧客を一括取得
    - **解決策2**: フロントエンドでキャッシュ（`getAllCustomersForSearch`）
    - **解決策3**: チャンク分割フィルタリング（2,000件/チャンク）でUI非ブロック
    - **解決策4**: 300ms デバウンスで連続入力時の検索を抑制
    - **結果**: 検索が即座に完了、UIフリーズなし

39. **売上管理ダッシュボードの実装:**
    - **データソース**: `data/sales/新：2025売上管理表 - 契約詳細.csv` (1,422行)
    - **CSVデータ埋め込み**: `scripts/generate-sales-data.js` でTypeScriptモジュール生成
    - **データ解析API**: `frontend/src/api/sales.ts`
      - `parseSalesCSV()`: CSV解析
      - `calculateDashboardSummary()`: 各種集計計算
    - **ダッシュボードUI**: `frontend/src/pages/Dashboard.tsx`
      - サマリーカード: 総申込額、総入金額、契約件数、入金率
      - グラフ（Chart.js）: 月次推移（棒）、大分類別構成比（円）、エリア別売上（棒）、寺院別TOP10（横棒）
      - テーブル: 月次推移詳細、寺院別年間売上、分類別（小分類）
    - **新規ライブラリ**: `chart.js`, `react-chartjs-2`

## 次のステップ (Phase 9: SFA & 商談機能)

### 優先タスク
1. [x] ~~**Firestoreインポート実行**~~ ✅ 完了
2. [ ] **関係性機能完成:** マスターCSV読み込み、Firestoreインポート
3. [ ] **CRUD Operations - Create:** 顧客新規作成機能
4. [ ] **CRUD Operations - Delete:** 顧客削除機能（論理削除）
5. [ ] **Search Functionality:** 顧客検索機能の実装（名前、住所、電話番号）

### 将来的な拡張
- **Deals Integration:** 顧客に紐づく案件表示
- **Voice-First Entry:** 音声録音 → Vertex AI 解析

## 既知の課題

### Technical Debt
- `clasp push` が "already up to date" を返し続ける問題（手動確認が必要）
- デバッグ用console.log/alertがコードに残っている（本番前に削除要）

### 開発時の注意点（重要）
詳細は `docs/DEVELOPMENT_GUIDE.md` を参照

1. **新しいGAS関数を追加したら `scripts/add-bridge.js` にも追加**
2. **Zodスキーマは既存データのフォーマットを確認してから設計**
3. **デプロイ後は最新バージョンが使われているか確認**

## V10/V11 廃止について

V10およびV11は開発環境の不安定さ（clasp + OneDrive問題、Script IDの無効化）により廃止されました。
両プロジェクトで得られた知見は以下に統合済みです：

- **教訓ドキュメント:** `docs/LESSONS_LEARNED_V10_V11.md`
- **GitHub アーカイブ:**
  - https://github.com/adminsaiproducts/V10
  - https://github.com/adminsaiproducts/V11

## 変更履歴 (Changelog)

| Date | Type | Details | Status |
| :--- | :--- | :--- | :--- |
| 2025-11-29 | SETUP | `CURRENT_STATUS.md` に変更履歴セクションを追加 | ✅ Done |
| 2025-12-03 | CONSOLIDATION | V10/V11知見をV9に統合 | ✅ Done |
| 2025-12-03 | DOCS | LESSONS_LEARNED_V10_V11.md 作成 | ✅ Done |
| 2025-12-03 | DOCS | PROJECT_MANIFEST.md 更新 | ✅ Done |
| 2025-12-03 | ARCHIVE | V10/V11 final state をGitHubにpush | ✅ Done |
| 2025-12-03 | FEATURE | 顧客更新機能 (api_updateCustomer) 実装 | ✅ Done |
| 2025-12-03 | FEATURE | 郵便番号⇔住所の双方向検索機能 | ✅ Done |
| 2025-12-03 | FIX | GASブリッジ関数の追加忘れ問題を解決 | ✅ Done |
| 2025-12-03 | FIX | Zodスキーマと既存データの整合性問題を解決 | ✅ Done |
| 2025-12-03 | DOCS | 開発ガイド (DEVELOPMENT_GUIDE.md) 作成 | ✅ Done |
| 2025-12-04 | FIX | URLFetch クォータ超過対応（キャッシュ・ページネーション実装） | ✅ Done |
| 2025-12-04 | FEATURE | 関係性機能UI（RelationshipList/Form/Resolver）実装 | ✅ Done |
| 2025-12-04 | FEATURE | 関係性API（CRUD + resolve）実装 | ✅ Done |
| 2025-12-04 | FEATURE | Firestore queryDocuments（WHERE句）対応 | ✅ Done |
| 2025-12-04 | ISSUE | 関係性マスターCSVのShift-JIS文字化け問題を発見 | ✅ Done |
| 2025-12-04 | FIX | iconv-liteでShift-JIS CSV読込、RELATIONSHIP_TYPES更新（51種類） | ✅ Done |
| 2025-12-04 | FIX | data/import/customers.json と migration版の競合解消 | ✅ Done |
| 2025-12-04 | SCHEMA | Staff, Product インターフェースを firestore.ts に追加 | ✅ Done |
| 2025-12-04 | SCRIPT | regenerate-migration-data.js 作成（正式スキーマでデータ再生成） | ✅ Done |
| 2025-12-05 | MIGRATION | Firestoreインポート完了（14,689件: Customers/Temples/Staff/Products/Deals） | ✅ Done |
| 2025-12-05 | OPTIMIZE | migration-master.gs batchWrite API最適化（500件/呼び出し） | ✅ Done |
| 2025-12-04 | DATA | firestore-temples/staff/products/deals.json 生成完了 | ✅ Done |
| 2025-12-04 | CLEANUP | import-customers.gs 削除（JSONファイル方式に統一） | ✅ Done |
| 2025-12-05 | FEATURE | 典礼責任者顧客の自動生成（M0001〜M1766: 1,766件） | ✅ Done |
| 2025-12-05 | FEATURE | 顧客-典礼責任者の関係性作成（1,775件） | ✅ Done |
| 2025-12-05 | FIX | 顧客一覧ソート順修正（数字追客NOを優先表示） | ✅ Done |
| 2025-12-05 | BUG | 典礼責任者住所データがJSON文字列で保存された問題を発見 | ✅ Fixed |
| 2025-12-05 | BUG | 住所のtownフィールドに番地・建物が混入していた問題を発見 | ✅ Fixed |
| 2025-12-05 | FIX | fix-memorial-customer-addresses.js で住所データ1,766件を修正 | ✅ Done |
| 2025-12-05 | DEPLOY | Version 207 - 顧客ソート順修正 | ✅ Done |
| 2025-12-06 | BUG | 電話番号パースの正規表現バグ発見（最後の1桁が切れる） | ✅ Fixed |
| 2025-12-06 | FIX | clean-data.ts の電話番号正規表現を修正 | ✅ Done |
| 2025-12-06 | FIX | fix-memorial-customer-phones.js で1,055件の電話番号を修正 | ✅ Done |
| 2025-12-06 | FEATURE | 高速検索機能（api_getAllCustomers + キャッシュ + チャンク分割） | ✅ Done |
| 2025-12-06 | FEATURE | 売上管理ダッシュボード（CSV解析 + Chart.js グラフ表示） | ✅ Done |
| 2025-12-06 | SCRIPT | generate-sales-data.js（CSVをTypeScriptモジュールに変換） | ✅ Done |
| 2025-12-06 | DEPLOY | Version 231 - 売上ダッシュボード + グラフ表示 | ✅ Done |

---

*最終更新: 2025-12-06*
*最新デプロイ: @231*
