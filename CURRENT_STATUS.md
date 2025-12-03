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

## 次のステップ (Phase 4: Usability Enhancement)

### 優先タスク
1. [ ] **Search Functionality:** 顧客検索機能の実装（名前、住所、電話番号）
2. [ ] **Pagination:** 50件制限の解除、ページネーション実装
3. [ ] **Customer Detail View:** 顧客詳細画面の実装
4. [ ] **Error Handling:** フロントエンドのエラー表示改善

### 将来的な拡張
- **CRUD Operations:** 顧客の作成・更新・削除機能
- **Address Lookup:** 双方向住所検索API（V10/V11実装済み、移植予定）
- **Relationships Display:** 顧客間の関係性表示
- **Deals Integration:** 顧客に紐づく案件表示
- **Performance Optimization:** Virtual Scrolling, Cache最適化

## 既知の課題

### Technical Debt
- `clasp push` が "already up to date" を返し続ける問題（手動確認が必要）
- フロントエンドが Material UI を含まない簡易版

### 改善候補
- Material UI の再導入（デザイン改善）
- React Router の再導入（ページ遷移）
- 住所検索APIの移植（V10/V11から）

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

---

*最終更新: 2025-12-03*
