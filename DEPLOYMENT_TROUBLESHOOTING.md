# CRM V9 デプロイメント トラブルシューティング

## 問題: Pagination制限 (50件 → 10,000件)

**発生日**: 2025-12-02
**症状**: 顧客一覧で50件しか表示されない

### 根本原因

1. **ソースコード**:
   `src/services/customer_service.ts` の `searchCustomers()` メソッドで `listDocuments` の上限が `50` に固定されていた

2. **clasp push の問題**:
   - ファイルハッシュ比較で「already up to date」と判断される
   - 認証切れの可能性
   - `.claspignore` や `.clasp.json` の設定問題

### 解決手順

1. **ローカル修正**:
   ```typescript
   // V9/src/services/customer_service.ts (line 84-88)
   searchCustomers(_query: string): Customer[] {
     // Fetch all customers (increased limit from 50 to 10000)
     return this.firestore.listDocuments<Customer>(this.collection, 10000);
   }
   ```

2. **Apps Script Editor で直接修正** (緊急時):
   - bundle.js を開く
   - `searchCustomers(_query)` メソッドを検索
   - `listDocuments(this.collection, 50)` → `listDocuments(this.collection, 10000)` に変更
   - 保存 → バージョン作成 → デプロイ

3. **clasp 認証の再確認**:
   ```bash
   cd V9
   clasp logout
   clasp login
   ```

4. **ビルドとプッシュ**:
   ```bash
   npm run build
   clasp push
   clasp version "Fix: Increase customer list limit to 10000"
   clasp deploy -V [version_number] -d "v[version]: Customer pagination fix"
   ```

## 再発防止策

### 1. デプロイ検証スクリプト

**目的**: デプロイ後に実際のAPIレスポンスを確認

**スクリプト**: `scripts/verify-deployment.js`
- デプロイURLにアクセス
- `api_searchCustomers('')` を呼び出し
- 返却件数を確認
- 10,000件未満の場合は警告

### 2. CI/CD パイプライン (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Apps Script

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: ./V9

      - name: Build
        run: npm run build
        working-directory: ./V9

      - name: Setup clasp
        run: |
          npm install -g @google/clasp
          echo "$CLASP_CREDENTIALS" > ~/.clasprc.json
        env:
          CLASP_CREDENTIALS: ${{ secrets.CLASP_CREDENTIALS }}

      - name: Push to Apps Script
        run: clasp push
        working-directory: ./V9

      - name: Create version
        run: clasp version "CI: ${{ github.sha }}"
        working-directory: ./V9

      - name: Deploy
        run: |
          VERSION=$(clasp versions | grep -oP '@\K\d+' | head -1)
          clasp deploy -V $VERSION -d "CI Deploy: ${{ github.run_number }}"
        working-directory: ./V9
```

### 3. デプロイ前チェックリスト

**手動デプロイ時**:
- [ ] `npm run build` が成功
- [ ] dist/bundle.js に修正内容が含まれている (grep確認)
- [ ] clasp の認証が有効 (`clasp login` 確認)
- [ ] clasp push が成功 (または Apps Script Editor で手動更新)
- [ ] バージョン番号を記録
- [ ] デプロイURL を確認
- [ ] 検証スクリプトで動作確認

### 4. ソースコード管理ルール

1. **main.ts と customer_service.ts の同期を保つ**:
   - `api_getCustomers()` は `searchCustomers('')` を呼び出す
   - `searchCustomers()` の上限は 10,000 に設定

2. **コメントで上限値を明記**:
   ```typescript
   // Fetch all customers (max: 10000)
   return this.firestore.listDocuments<Customer>(this.collection, 10000);
   ```

3. **Git コミット前の確認**:
   ```bash
   # 上限値が変更されていないか確認
   git diff src/services/customer_service.ts | grep -i "listDocuments"
   ```

### 5. モニタリング

**デプロイ後**:
- 顧客一覧画面で「1-25 of XXXX」の XXXX が 10,000以上か確認
- Google Cloud Console で Firestore API の呼び出し回数を監視
- エラーログを確認

## トラブルシューティング コマンド

```bash
# clasp の状態確認
clasp login --status 2>/dev/null || echo "Not logged in"

# リモートとローカルの差分確認
clasp pull --versionNumber [version]
diff dist/bundle.js <backup_bundle.js>

# 強制プッシュ (非推奨、緊急時のみ)
rm -rf .clasp.cache
clasp push --force

# バージョン一覧
clasp versions

# デプロイ一覧
clasp deployments
```

## 参考情報

- Apps Script Editor: https://script.google.com/home/projects/1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ/edit
- Firestore Console: https://console.cloud.google.com/firestore/databases/crm-database-v9
- GitHub Repository: https://github.com/adminsaiproducts/V9

---

**最終更新**: 2025-12-02
**作成者**: Claude Code
**バージョン**: 145
