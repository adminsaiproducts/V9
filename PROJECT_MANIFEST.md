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
V10/V11で得られた知見は `docs/LESSONS_LEARNED_V10_V11.md` に統合済み。

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
- **GAS :// パターン問題**: JavaScriptに`://`が含まれるとGASがコメントと誤認識。Base64エンコーディングで解決可能（詳細は `docs/LESSONS_LEARNED_V10_V11.md`）
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

## 5. 次のステップ (Phase 5+)

### 優先タスク
1. **CRUD Operations - Create**: 顧客新規作成機能
2. **CRUD Operations - Delete**: 顧客削除機能（論理削除）
3. **Search Functionality**: 顧客検索機能の実装

### 将来的な拡張
- **Relationships Display**: 顧客間の関係性表示
- **Deals Integration**: 顧客に紐づく案件表示
- **Voice-First Entry**: 音声録音 → Vertex AI 解析

## 6. ガバナンスとセキュリティ

- **Audit Ready**: 全データ変更に対し、AuditLogsに記録
- **Soft Delete**: 物理削除は禁止、論理削除のみ
- **RBAC**: Firestoreセキュリティルールによるアクセス制御

## 7. 参照ドキュメント

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 進捗状況
- [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) - **開発ガイド（必読）**
- [docs/LESSONS_LEARNED_V10_V11.md](./docs/LESSONS_LEARNED_V10_V11.md) - V10/V11からの教訓

## 8. 開発時の重要な注意点

> **新規開発者（人間・AI問わず）は必ず `docs/DEVELOPMENT_GUIDE.md` を読んでください**

### よくある失敗パターン

| 症状 | 原因 | 解決策 |
|------|------|--------|
| Method not found | `add-bridge.js` にブリッジ関数がない | ブリッジ関数を追加 |
| フォーム送信が動かない | Zodスキーマと既存データが不一致 | 既存データに合わせてスキーマ修正 |
| 更新されない | 古いデプロイメントを使用 | `clasp deploy` で新バージョン作成 |

---

*最終更新: 2025-12-03*
*最新デプロイ: @164*
