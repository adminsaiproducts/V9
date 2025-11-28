# CRM V9 クイックリファレンス

## 🚀 クイックコマンド

### Squadメンバーの呼び出し
```bash
# 計画
"Plannerとして、これを分解してください: [要件]"

# バックエンド開発
"Backend-Devとして、これを実装してください: [タスク]"

# フロントエンド開発
"Frontend-Devとして、これを実装してください: [タスク]"

# 品質保証
"Auditorとして、これを検証してください: [検証対象]"

# デプロイ
"Directorとして、これをデプロイしてください: [デプロイ対象]"
```

---

## 🔨 よく使うPowerShellコマンド

### ビルド
```powershell
# フルビルド
npm run build

# バックエンドのみ
npm run build:backend

# フロントエンドのみ
npm run build:frontend

# 出力確認
Get-ChildItem dist/ | Select-Object Name, Length
```

### デプロイ
```powershell
# デプロイ一覧
clasp deployments

# コードをプッシュ
clasp push -f

# 新バージョンをデプロイ
clasp deploy --description "説明をここに"

# アンデプロイ（引用符必須！）
clasp undeploy "@AKfycby..."
```

### Git
```powershell
# ステータス確認
git status

# 全て追加
git add .

# コミット
git commit -m "メッセージ"

# プッシュ
git push origin main
```

---

## ✅ コンプライアンスチェックリスト

### Backend-Dev
- [ ] Windows/PowerShell構文
- [ ] 全操作に監査ログ
- [ ] 論理削除（物理削除禁止）
- [ ] ビルド出力 > 1KB

### Frontend-Dev
- [ ] Base64エンコード設定済み
- [ ] MUIコンポーネントのみ
- [ ] TypeScriptエラーなし
- [ ] ダッシュボード読み込み < 1秒

### Auditor
- [ ] ビジュアル検証スクリーンショット
- [ ] 全DOD基準達成
- [ ] コンソールエラーなし
- [ ] コンプライアンス検証済み

### Director
- [ ] マニフェスト準拠
- [ ] Auditor承認済み
- [ ] デプロイ成功
- [ ] Gitコミット済み

---

## 🎯 典型的なワークフロー

```
1. Planner: 要件を分解
   ↓
2. Backend-Dev: サーバーロジック実装
   ↓
3. Frontend-Dev: UI実装
   ↓
4. Auditor: すべてを検証
   ↓
5. Director: 本番環境へデプロイ
```

---

## 📁 主要ファイル

```
.agent/
├── SQUAD_GUIDE.md          # 完全ガイド
├── workflows/
│   ├── planner.md          # タスク分解
│   ├── backend-dev.md      # GAS/Firestore
│   ├── frontend-dev.md     # React/MUI
│   ├── auditor.md          # QA & 検証
│   └── director.md         # デプロイ
└── deployment-log.md       # デプロイ履歴

PROJECT_MANIFEST.md         # システム要件
SQUAD_GUIDE.md              # Squadガイド（日本語）
QUICK_REFERENCE.md          # このファイル
```

---

## 🛡️ 重要な制約

### Windows/PowerShell
```powershell
# ❌ 間違い
rm -rf dist/
npm run build && clasp push
clasp undeploy AKfycby...

# ✅ 正しい
Remove-Item -Recurse -Force dist/
npm run build; if ($?) { clasp push }
clasp undeploy "@AKfycby..."
```

### Base64エンコード
```typescript
// サーバー（GAS）
const jsContent = HtmlService.createHtmlOutputFromFile('javascript').getContent();
const jsBase64 = Utilities.base64Encode(jsContent);

// クライアント（HTML）
const jsCode = decodeURIComponent(atob(window.__JS__));
```

### 監査ログ
```typescript
// 常に操作をログに記録
await db.collection('AuditLogs').add({
  timestamp: FieldValue.serverTimestamp(),
  userId: userId,
  action: 'UPDATE',
  collection: 'Customers',
  documentId: id,
  before: beforeData,
  after: afterData
});
```

### 論理削除
```typescript
// ❌ 絶対禁止
await db.collection('Customers').doc(id).delete();

// ✅ 常にこれ
await db.collection('Customers').doc(id).update({
  deletedAt: FieldValue.serverTimestamp(),
  deletedBy: userId
});
```

---

## 🔧 トラブルシューティング

### ビルド失敗
```powershell
# クリーンして再ビルド
Remove-Item -Recurse -Force dist/
Remove-Item -Recurse -Force node_modules/
npm install
npm run build
```

### デプロイ上限到達
```powershell
# デプロイ一覧
clasp deployments

# 古いものを5つアンデプロイ
# （上記コマンドからIDを取得）
clasp undeploy "@ID1"
clasp undeploy "@ID2"
# ... など
```

### TypeScriptエラー
```powershell
# 型チェック
npm run type-check

# エラー詳細表示
npx tsc --noEmit
```

---

## 📞 ヘルプの取得

```
# ワークフローを表示
"[ロール]ワークフローを見せてください"

# ワークフロー一覧
"利用可能なワークフローは何ですか？"

# ロールを理解
"[ロール]ロールを説明してください"
```

---

## 🎉 準備完了！

**開始ポイントを選んでください**:
- 新機能? → `/planner`
- バックエンドタスク? → `/backend-dev`
- フロントエンドタスク? → `/frontend-dev`
- 検証とデプロイ? → Auditor → Director

**完全ガイド**: `SQUAD_GUIDE.md`を参照
