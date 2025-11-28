
| プロパティ名 | 設定値 |
| :--- | :--- |
| `FIRESTORE_PROJECT_ID` | `crm-appsheet-v7` |
| `FIRESTORE_DATABASE_ID` | `crm-database-v9` |
| `FIRESTORE_EMAIL` | `crm-v7-automation@crm-appsheet-v7.iam.gserviceaccount.com` |
| `FIRESTORE_KEY` | `config/serviceAccount.json` の `private_key` 全文 |

## 🏗️ ビルドシステム構成 (3-File Pattern)

**採用戦略:** Separated Assets Pattern (GAS Size Limitation対応)

### 技術スタック
- **Frontend Build:** Vite + React + TypeScript
- **Backend Build:** Webpack + gas-webpack-plugin
- **GAS Template:** 3-File Pattern (`index.html` + `javascript.html` + `stylesheet.html`)

### ファイル構成
```
dist/
├── index.html          (305 B)   - GAS template with <?!= include() ?> tags
├── javascript.html     (196 KB)  - All JS wrapped in <script> tags
├── stylesheet.html     (959 B)   - All CSS wrapped in <style> tags
├── bundle.js          (18.8 KB) - Backend GAS code (with CustomerService)
└── appsscript.json    (240 B)   - GAS manifest
```

### 技術的知見
- **Vite + SingleFile 戦略の制約:** GAS `HtmlService` には HTML サイズ制限（推定 < 500 KB）が存在し、1MB超の単一HTMLファイルはデプロイ時にクラッシュする。
- **採用理由:** `PROJECT_MANIFEST.md` Section 5.B の例外条項に基づき、3ファイルパターンを採用。
- **実装詳細:** `scripts/gas-build.js` でViteビルド後のJS/CSSを `<script>`/`<style>` タグでラップし、`include()` 関数で動的結合。
- **Global Scope Exposure:** Webpack バンドル内の関数を `globalThis` に明示的に代入し、GAS ランタイムが認識できるようにする。

## 🏁 完了したマイルストーン

### Phase 1: Database Setup ✅
1.  **Firestore データベース作成:** `crm-database-v9` (Tokyo)
2.  **データ移行 (ETL):** 10,852件 (検証完了)
3.  **機能実装:** AuditLog, REST API Endpoint
4.  **パフォーマンス:** 58ms/request (High Speed)

### Phase 2: Infrastructure Setup ✅
5.  **Technical Debt:** Removed `any` types (Strict TypeScript Compliance)
6.  **Infrastructure:** Added `AICacheService` & `scripts/setup.ts` (Zero-Touch)
7.  **Build System:** Vite + Webpack ハイブリッド構成
8.  **Frontend Foundation:** Vite + React + TypeScript
9.  **3-File Pattern Migration:** GAS制限回避のため Separated Assets 戦略を実装
10. **Deployment Pipeline:** `npm run build` → `clasp push -f` → `clasp deploy` 自動化

### Phase 3: Real Data Connection ✅
11. **Code Consolidation:** `globalThis` 露出コードの永続化（v113）
12. **Firestore Integration:** `CustomerService` を使用した実データ取得（v116）
13. **Type Mapping:** Customer型の正しいマッピング（`nameKana`, 構造化address）
14. **Verification:** ブラウザで実データ表示を確認（10,852件の顧客データ）
15. **Bridge Injection:** `doPost` 実装と `add-bridge.js` による自動注入の完全化（v133）

## 📝 次のステップ (Phase 4: Usability Enhancement)

### 優先タスク
1.  **Search Functionality:** 顧客検索機能の実装（名前、住所、電話番号）
2.  **Pagination:** 50件制限の解除、ページネーション実装
3.  **Customer Detail View:** 顧客詳細画面の実装
4.  **Error Handling:** フロントエンドのエラー表示改善

### 将来的な拡張
- **CRUD Operations:** 顧客の作成・更新・削除機能
- **Relationships Display:** 顧客間の関係性表示
- **Deals Integration:** 顧客に紐づく案件表示
- **Performance Optimization:** Virtual Scrolling, Cache最適化

## 🔧 既知の課題

### Technical Debt
- `clasp push` が "already up to date" を返し続ける問題（手動確認が必要）
- フロントエンドが Material UI を含まない簡易版（Phase 3 で簡略化）

### 改善候補
- Material UI の再導入（デザイン改善）
- React Router の再導入（ページ遷移）
- エラーハンドリングの強化