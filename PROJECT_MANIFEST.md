# CRM V9 MANIFEST: Antigravity Native Enterprise Model

## Repository Information
- **Name**: CRM V9
- **URL**: https://github.com/adminsaiproducts/V9
- **Branch**: main (Protected Source of Truth)
- **Script ID**: `1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ`

## 0. 戦略的使命 (Strategic Mission)

本プロジェクトは、Googleエコシステム（GAS + Firestore + Vertex AI）を極限まで活用した「中小企業向け次世代SFA」の標準モデルである。
既存SaaS（AppSheet等）への依存を排除し、**「上場企業レベルのガバナンス」**と**「リアルタイム経営判断」**を、サーバーレスかつ低コストで実現することを絶対的なゴールとする。

### V10/V11 統合後の位置づけ
V10およびV11の開発は環境の不安定さにより廃止され、V9が唯一の開発環境として継続。
V10/V11で得られた知見は `docs/DEVELOPMENT_GUIDE.md` セクション9に統合済み。

## 1. 環境設定

### GCP/Firestore設定
| プロパティ名 | 設定値 |
| :--- | :--- |
| `FIRESTORE_PROJECT_ID` | `crm-appsheet-v7` |
| `FIRESTORE_DATABASE_ID` | `crm-database-v9` |
| `FIRESTORE_EMAIL` | `crm-v7-automation@crm-appsheet-v7.iam.gserviceaccount.com` |

### GAS Script Properties
| プロパティ名 | 用途 |
| :--- | :--- |
| `FIRESTORE_PROJECT_ID` | Firestoreプロジェクト識別 |
| `FIRESTORE_DATABASE_ID` | Firestoreデータベース識別 |
| `FIRESTORE_EMAIL` | サービスアカウント認証 |
| `FIRESTORE_KEY` | サービスアカウント秘密鍵 |
| `GOOGLE_MAPS_API_KEY` | 住所検索 (Geocoding API) - 将来実装用 |

## 2. 技術アーキテクチャ

### A. React/GAS 完全分離構成
```
V9/
├── dist/                # [Deploy Target]
├── frontend/            # [Client Side] React + Vite
│   ├── src/
│   └── vite.config.ts
├── src/                 # [Server Side] GAS + TypeScript
│   ├── main.ts          # GAS Entry Point
│   ├── services/        # Business Logic
│   │   ├── firestore.ts # REST API based (supports named databases)
│   │   └── customer_service.ts
│   ├── types/           # Type Definitions
│   └── config.ts        # Configuration
├── scripts/             # Build Pipeline
│   ├── inject-stubs.js
│   └── gas-build.js
└── webpack.config.js
```

### B. Technical Rules (鉄の掟)
1. **Total Separation**: Server(GAS)とFrontend(React)の相互import禁止
2. **REST API Only**: Firestoreへは`FirestoreApp`ライブラリではなく、REST APIを使用（非デフォルトDB対応のため）
3. **3-File Pattern**: HTMLサイズ制限回避のため、JS/CSSを分離デプロイ
4. **Bridge Function必須**: 新しいGAS関数は `scripts/add-bridge.js` にも追加が必要（詳細は `docs/DEVELOPMENT_GUIDE.md`）

### C. ビルドシステム
```
dist/
├── index.html          (GASテンプレート)
├── javascript.html     (全JS)
├── stylesheet.html     (全CSS)
├── bundle.js          (Backend GAS code)
└── appsscript.json    (GAS manifest)
```

## 3. 開発ワークフロー

### Build Commands
```bash
npm run build           # Full build (Backend + Frontend)
npm run build:backend   # Backend only (Webpack)
npm run build:frontend  # Frontend only (Vite)
clasp push -f           # Deploy to GAS
clasp deploy            # Create new version
```

### 既知の問題と対策
- **GAS :// パターン問題**: JavaScriptに`://`が含まれるとGASがコメントと誤認識。Base64エンコーディングで解決可能（詳細は `docs/DEVELOPMENT_GUIDE.md` セクション9.1）
- **clasp + OneDrive**: 同期問題が発生する場合あり。`.clasp.json`のScript IDを確認

## 4. 完了済み機能

### Phase 1: Database Setup
- [x] Firestore データベース作成 (`crm-database-v9`)
- [x] データ移行 (ETL): 10,852件
- [x] AuditLog, REST API Endpoint
- [x] パフォーマンス: 58ms/request

### Phase 2: Infrastructure Setup
- [x] Build System: Vite + Webpack ハイブリッド構成
- [x] Frontend Foundation: Vite + React + TypeScript
- [x] 3-File Pattern Migration
- [x] Deployment Pipeline

### Phase 3: Real Data Connection
- [x] Firestore Integration: CustomerService
- [x] Bridge Injection: doPost 実装
- [x] ブラウザで実データ表示確認（10,852件）

### Phase 4: Customer Edit & Postal Code Features ✅ (2025-12-03)
- [x] 顧客更新機能: `api_updateCustomer` GAS関数
- [x] GASブリッジ修正: `scripts/add-bridge.js` にAPI関数追加
- [x] 郵便番号→住所: 複数結果選択UI (zipcloud API)
- [x] 住所→郵便番号: 逆引き機能 (HeartRails Geo API)
- [x] 整合性チェック: 郵便番号と住所の不一致警告
- [x] 開発ガイド: `docs/DEVELOPMENT_GUIDE.md` 作成

### Phase 5: API最適化 & 関係性機能 ✅ (2025-12-04 完了)
- [x] URLFetch クォータ超過エラー対応
  - キャッシュシステム実装（`getCachedOrFetch`）
  - ページネーション対応（`api_getCustomersPaginated`）
  - フロントエンドの楽観的更新（Optimistic Updates）
- [x] 関係性機能UI実装
  - `RelationshipList.tsx` - 関係性一覧表示
  - `RelationshipForm.tsx` - 関係性追加/編集ダイアログ
  - `RelationshipResolver.tsx` - 手動確認ダイアログ
- [x] GAS Relationship API実装
  - `api_getCustomerRelationships` - 顧客関係性取得
  - `api_createRelationship` - 関係性作成
  - `api_updateRelationship` - 関係性更新
  - `api_deleteRelationship` - 関係性削除
  - `api_resolveRelationship` - 関係性確認/却下
- [x] Firestore queryDocuments対応（WHERE句対応）

### Phase 6: マスタデータ統合 & Firestoreインポート ✅ (2025-12-05 完了)
- [x] インポートデータ重複問題の解消（Single Source of Truth）
- [x] Firestoreスキーマ拡張（Staff, Product）
- [x] マスタデータ再生成（63寺院, 57担当者, 66商品, 3,651商談）
- [x] Firestoreインポート完了（14,689件）
- [x] migration-master.gs batchWrite API最適化

### Phase 7: 典礼責任者顧客データ統合 ✅ (2025-12-05 完了)
- [x] 典礼責任者顧客の自動生成（M0001〜M1766: 1,766件）
- [x] 顧客-典礼責任者の関係性作成（1,775件）
- [x] 顧客一覧のソート順修正（数字追客NOを優先表示）
- [x] 住所データ構造問題の修正（JSON文字列→オブジェクト、town/streetNumber/building分離）

### Phase 8: 検索最適化 & ダッシュボード機能 ✅ (2025-12-06 完了)
- [x] **高速検索機能**: 13,673件の顧客を即座に検索可能
  - `api_getAllCustomers` GAS関数（全顧客一括取得）
  - フロントエンドキャッシュ（`getAllCustomersForSearch`）
  - チャンク分割フィルタリング（2,000件/チャンク、UI非ブロック）
  - 300ms デバウンス（入力中の連続検索を防止）
- [x] **売上管理ダッシュボード**: CSVデータから自動集計・表示
  - サマリーカード（総申込額、総入金額、契約件数、入金率）
  - グラフ表示（Chart.js）: 月次推移、大分類別構成比、エリア別売上、寺院別TOP10
  - テーブル表示: 月次推移詳細、寺院別年間売上、分類別（小分類）
  - CSVデータ埋め込みスクリプト（`scripts/generate-sales-data.js`）

### Phase 9: URL共有機能 ✅ (2025-12-06 完了)
- [x] **検索状態のURL化**: `useSearchParams` による検索クエリのURL反映
  - 顧客一覧: `#/customers?q=検索語` 形式
  - ブラウザ戻る/進むボタンで検索状態を復元
  - デバウンス（300ms）でURL更新頻度を抑制
- [x] **共有ボタン**: 現在のURLをクリップボードにコピー
- [x] **DeepLinkHandler拡張**: サーバーサイドからの検索クエリ対応

### Phase 10: ディープリンク最適化 ✅ (2025-12-06 完了)
- [x] **クエリパラメータ方式ディープリンク**: GAS制限に対応した実装
  - `?view=customer_detail&id=M0024` 形式で顧客詳細に直接アクセス
  - `?view=customers&q=検索語` 形式で検索結果を共有
  - `CRM_INITIAL_STATE`を通じてフロントエンドにパラメータ伝達
- [x] **deploymentUrl管理**: BreadcrumbContextで一元管理
- [x] **api_getCustomerByTrackingNo**: trackingNoで顧客取得するAPIを追加
- [x] **GAS技術的制限の文書化**: ブラウザアドレスバーURL変更不可の制限を明記
- [x] **Firebase移行計画の策定**: 将来の完全URL制御のための代替案を文書化

## 5. 次のステップ (Phase 11+)

### 優先タスク
1. **関係性機能完成**: マスターCSV読み込み、Firestoreインポート
2. **CRUD Operations - Create**: 顧客新規作成機能
3. **CRUD Operations - Delete**: 顧客削除機能（論理削除）
4. **Search Functionality**: 顧客検索機能の実装

### 将来的な拡張
- **Deals Integration**: 顧客に紐づく案件表示
- **Voice-First Entry**: 音声録音 → Vertex AI 解析

## 6. ガバナンスとセキュリティ

- **Audit Ready**: 全データ変更に対し、AuditLogsに記録
- **Soft Delete**: 物理削除は禁止、論理削除のみ
- **RBAC**: Firestoreセキュリティルールによるアクセス制御

## 7. 参照ドキュメント

| ドキュメント | 役割 | 更新タイミング | 必読度 |
|-------------|------|----------------|--------|
| [CURRENT_STATUS.md](./CURRENT_STATUS.md) | 進捗・完了機能・変更履歴 | 機能完了/問題解決時 | ★★★ |
| [PROJECT_MANIFEST.md](./PROJECT_MANIFEST.md) | プロジェクト全体像・鉄則・環境設定 | アーキテクチャ変更時 | ★★★ |
| [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) | **開発ガイド（必読）** - 知見・失敗・ベストプラクティス・V10/V11教訓 | 新しい知見が得られたとき | ★★★ |
| [docs/SFA_DESIGN.md](./docs/SFA_DESIGN.md) | SFA設計書 - 商談・契約・レポート設計 | SFA機能追加時 | ★★☆ |

### ドキュメントの使い方

1. **開発開始時**: `CURRENT_STATUS.md` → `PROJECT_MANIFEST.md` → `DEVELOPMENT_GUIDE.md` の順で読む
2. **新機能実装時**: 該当する設計書（`SFA_DESIGN.md`等）を確認してから実装
3. **問題発生時**: `DEVELOPMENT_GUIDE.md` のトラブルシューティングを確認
4. **セッション終了時**: 知見を `DEVELOPMENT_GUIDE.md` に追記し、`CURRENT_STATUS.md` の変更履歴を更新
5. **データ移行時**: `migration/output/gas-scripts/` の正式データファイルを使用（後述）

## 8. 開発時の重要な注意点

> **新規開発者（人間・AI問わず）は必ず `docs/DEVELOPMENT_GUIDE.md` を読んでください**

### よくある失敗パターン

| 症状 | 原因 | 解決策 |
|------|------|--------|
| Method not found | `add-bridge.js` にブリッジ関数がない | ブリッジ関数を追加 |
| フォーム送信が動かない | Zodスキーマと既存データが不一致 | 既存データに合わせてスキーマ修正 |
| 更新されない | 古いデプロイメントを使用 | `clasp deploy` で新バージョン作成 |
| URLFetch exceeded | GAS日次クォータ超過 | キャッシュ・ページネーション実装、17:00 JSTリセット待ち |
| CSVが文字化け | Shift-JISファイルをUTF-8で読込 | PowerShellでCP932指定して読込 |
| インポートデータ競合 | 複数箇所で同じデータを生成 | Single Source of Truth: `migration/output/gas-scripts/` のみ使用 |
| 住所が表示されない | JSON文字列として保存 | オブジェクトとして保存（`DEVELOPMENT_GUIDE.md` セクション9参照） |
| 住所のtownに番地混入 | パース関数が分離しない | 正規表現で町名・番地・建物を分離 |
| 電話番号の最後の桁が欠落 | 正規表現 `(.+)$` が最後の1文字をマッチ | `([^\d\-].*)$` で文字種を指定（セクション8.1参照） |
| エリア別・寺院別グラフが空 | 寺院IDフォーマット不一致（T0001 vs TEMPLE-*） | 同じIDフォーマットを使用するデータソースを確認 |
| 読み込み中に「全 0 件」表示 | null/undefined と 0 の区別なし | null 時は「読み込み中...」を表示する分岐を追加 |
| api_xxx not found | add-bridge.jsにブリッジ関数がない | ブリッジ関数を追加後、build → push → deploy |
| ディープリンクが動かない | 古いデプロイメントバージョン | `clasp deploy`で新バージョン作成、URLを更新 |
| URLがサンドボックスURL | GASのiframe制限 | URLコピーボタンで正式URLを取得（アドレスバー変更は不可） |

## 9. データ移行（Firestoreインポート）

### 正式データファイル（Single Source of Truth）

**重要**: インポート用データは `migration/output/gas-scripts/` のみを使用してください。
`data/import/` は作業用一時ファイル置き場であり、正式データではありません。

| ファイル | 件数 | コレクション | 説明 |
|---------|------|-------------|------|
| `firestore-customers.json` | 10,852件 | Customers | 顧客マスタ |
| `firestore-temples.json` | 63件 | Temples | 寺院マスタ |
| `firestore-staff.json` | 57件 | Staff | 担当者マスタ |
| `firestore-products.json` | 66件 | Products | 商品マスタ |
| `firestore-deals.json` | 3,651件 | Deals | 商談データ |
| `deals-batches/` | 37バッチ | Deals | 商談分割（100件/バッチ） |

### インポート手順

1. **Google Driveにアップロード**: 上記JSONファイルをGoogle Driveにアップロード
2. **ファイルIDを取得**: アップロードしたファイルのIDをコピー
3. **GASエディタで実行**:
   ```javascript
   // migration-master.gs の MIGRATION_FILE_ID を設定
   const MIGRATION_FILE_ID = 'YOUR_FILE_ID_HERE';

   // 実行
   runFullMigration();
   ```

### GASスクリプト

| ファイル | 用途 |
|---------|------|
| `migration-master.gs` | メインインポートスクリプト（顧客・マスタデータ） |
| `import-relationships.gs` | 関係性データインポート |

### データ再生成

マスタデータのスキーマを変更した場合:
```bash
node migration/scripts/regenerate-migration-data.js
```

このスクリプトは `data/import/` のデータを `src/types/firestore.ts` のスキーマに合わせて変換し、`migration/output/gas-scripts/` に出力します。

## 10. GAS技術的制限と将来の移行計画

### 現在の制限事項

GASウェブアプリはGoogleのサンドボックスiframe内で動作するため、以下の制限があります：

| 機能 | GAS環境 | 通常Webアプリ |
|------|---------|--------------|
| アドレスバーURL変更 | ✗ 不可 | ✓ 可能 |
| ブックマーク | △ URLコピーで対応 | ✓ 自動 |
| 戻る/進むボタン | △ アプリ内のみ | ✓ 完全対応 |
| ディープリンク | △ クエリパラメータ方式 | ✓ パス方式 |

### 将来の移行先候補: Firebase Hosting

GASの制限を完全に解消するための移行計画：

```
[現在] GAS iframe → URL制限あり
  ↓
[将来] Firebase Hosting + Cloud Functions → URL完全制御
```

**Firebase移行のメリット:**
- URLが完全に制御可能（`/customers/M0024`形式がアドレスバーに表示）
- 既存Firestoreデータをそのまま使用可能（移行不要）
- 高速CDN配信
- PWA対応可能（オフライン機能）
- Google認証との親和性

**移行工数:** 1-2週間程度
- API層の書き換え（GAS → Cloud Functions）
- 認証実装（Firebase Auth）
- デプロイ設定

詳細は `docs/DEVELOPMENT_GUIDE.md` セクション18を参照。

---

*最終更新: 2025-12-06*
*最新デプロイ: v251*
