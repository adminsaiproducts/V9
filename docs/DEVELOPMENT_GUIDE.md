# CRM V9 開発ガイド

このドキュメントは、V9開発で得られた知見・失敗・ベストプラクティスをまとめ、今後の開発者（人間・AI問わず）が同じ問題を繰り返さないための指針です。

## 1. GAS開発の鉄則

### 1.1 関数のエクスポート（最重要）

GASでは、フロントエンドから`google.script.run.functionName()`で呼び出せる関数は**トップレベルスコープ**に定義する必要があります。

**問題:**
- Webpackでバンドルすると、すべてのコードがIIFE（即時実行関数）内にラップされる
- `globalThis.api_xxx = api_xxx` だけでは不十分
- フロントエンドから「Method xxx not found」エラーが発生

**解決策:**
`scripts/add-bridge.js` にブリッジ関数を追加する必要がある。

```javascript
// ❌ これだけでは不十分
globalThis.api_updateCustomer = api_updateCustomer;

// ✅ add-bridge.js にも追加が必要
function api_updateCustomer(id, updates) {
  return globalThis.api_updateCustomer(id, updates);
}
```

**チェックリスト（新しいAPI関数を追加するとき）:**
1. [ ] `src/main.ts` に関数を実装
2. [ ] `src/main.ts` の末尾で `globalThis.xxx = xxx` を追加
3. [ ] `scripts/add-bridge.js` のブリッジコードに関数を追加
4. [ ] `npm run build && clasp push -f && clasp deploy` を実行

### 1.2 デプロイメントの確認

**問題:**
- `clasp push` が「Script is already up to date」と表示しても、実際には更新されていない場合がある
- 古いデプロイメントバージョンを使用していると、新しい関数が見つからない

**解決策:**
```bash
# 現在のデプロイメント一覧を確認
clasp deployments

# 新しいバージョンをデプロイ
clasp deploy -d "説明"

# URLのデプロイメントIDが最新のものか確認
# 例: AKfycbyaF8F1-b50acNzCg... @164
```

## 2. フロントエンド開発の注意点

### 2.1 Zodバリデーションスキーマと既存データの整合性

**問題:**
- 既存データに「男」「女」が保存されているが、スキーマは「male」「female」のみを許可
- フォーム送信時にバリデーションエラーが発生し、submitハンドラーが呼ばれない
- コンソールに「out-of-range value」警告が表示される

**解決策:**
```typescript
// ❌ 新しいデータのみを想定
gender: z.enum(['male', 'female', 'other', '']).optional()

// ✅ 既存データも許可
gender: z.enum(['male', 'female', 'other', '男', '女', '']).optional()
```

**教訓:**
- 既存データのフォーマットを必ず確認してからスキーマを設計
- CSVデータ（`data/genieeCRM/`）を参照して実際の値を確認

### 2.2 MUI Grid コンポーネント

**問題:**
- MUI v7では`Grid2`は存在しない（v6からの変更）
- `Grid2 as Grid`でインポートするとエラー

**解決策:**
```typescript
// ❌ v6の書き方
import { Grid2 as Grid } from '@mui/material';

// ✅ v7の書き方
import { Grid } from '@mui/material';
<Grid size={{ xs: 12, sm: 6 }}>...</Grid>
```

### 2.3 デバッグ用ログの追加

フォーム送信が動作しない場合のデバッグ手順：

```typescript
const handleUpdate = async (data: any) => {
  console.log('handleUpdate called with:', data);  // 1. 呼ばれているか確認
  console.log('Customer ID:', id);

  try {
    console.log('Calling api_updateCustomer...');  // 2. API呼び出し前
    const result = await callGAS(...);
    console.log('Update result:', result);          // 3. 結果確認
    alert('更新しました');                          // 4. 成功通知
  } catch (err) {
    console.error('Failed:', err);
    alert('エラー: ' + err.message);                // 5. エラー通知
  }
};
```

## 3. 外部API利用の知見

### 3.1 郵便番号API

| API | 用途 | URL |
|-----|------|-----|
| zipcloud | 郵便番号→住所 | `https://zipcloud.ibsnet.co.jp/api/search?zipcode=XXX` |
| HeartRails Geo | 住所→郵便番号 | `https://geoapi.heartrails.com/api/json?method=getTowns&...` |

**注意:**
- zipcloudは郵便番号→住所の**一方向のみ**
- 住所→郵便番号の逆引きにはHeartRails Geo APIを使用

### 3.2 複数結果の処理

1つの郵便番号に複数の町域がある場合：
- ユーザーに選択UIを表示
- 自動選択せずに明示的な選択を求める

## 4. 開発フロー

### 4.1 新機能追加の標準フロー

```
1. 設計確認
   - 既存データのフォーマット確認（Firestoreコンソール or CSVファイル）
   - 型定義の確認（frontend/src/api/types.ts）

2. バックエンド実装
   - src/main.ts に関数追加
   - globalThis への登録
   - scripts/add-bridge.js にブリッジ追加

3. フロントエンド実装
   - コンポーネント作成/修正
   - 既存データとの整合性確認（Zodスキーマ）

4. ビルド・デプロイ
   - npm run build
   - clasp push -f
   - clasp deploy -d "説明"
   - デプロイメントID確認

5. テスト
   - ブラウザコンソールでデバッグログ確認
   - 実データで動作確認
```

### 4.2 トラブルシューティングチェックリスト

| 症状 | 確認項目 |
|------|----------|
| Method not found | add-bridge.js にブリッジ関数があるか |
| フォーム送信が動かない | Zodスキーマと既存データの整合性 |
| データが更新されない | デプロイメントバージョンが最新か |
| コンソールに警告 | MUIコンポーネントのprops確認 |

## 5. ファイル構成と責務

```
V9/
├── src/main.ts                    # GAS API関数（エントリーポイント）
├── src/services/                  # ビジネスロジック
├── scripts/add-bridge.js          # GASブリッジ関数（重要！）
├── frontend/src/
│   ├── api/client.ts              # GAS呼び出しラッパー
│   ├── api/types.ts               # 型定義（Firestoreスキーマと一致させる）
│   ├── components/                # UIコンポーネント
│   ├── hooks/                     # カスタムフック（API連携等）
│   └── pages/                     # ページコンポーネント
├── docs/
│   ├── DEVELOPMENT_GUIDE.md       # 本ドキュメント
│   └── LESSONS_LEARNED_V10_V11.md # 過去の教訓
├── CURRENT_STATUS.md              # 進捗・完了機能
└── PROJECT_MANIFEST.md            # プロジェクト全体像
```

## 6. Claude Code / AI開発者への指示

このプロジェクトでAI開発者が作業する際は、以下を必ず確認してください：

1. **新しいGAS関数を追加する場合**
   - `add-bridge.js` への追加を忘れずに

2. **フォームを実装する場合**
   - 既存データのフォーマットを先に確認
   - Zodスキーマに既存値を含める

3. **デプロイ後に動作しない場合**
   - デプロイメントバージョンが更新されているか確認
   - ブラウザをハードリロード（Ctrl+Shift+R）

4. **デバッグ時**
   - console.logとalertを追加してどこまで処理が進んでいるか確認

---

*最終更新: 2025-12-03*
*作成者: Claude Code*
