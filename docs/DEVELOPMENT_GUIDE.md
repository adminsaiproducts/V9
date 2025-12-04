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

### 3.3 GAS URLFetch クォータ制限（重要）

**問題:**
- GASのURLFetchには日次クォータ制限がある
- Consumer (無料) アカウント: **20,000 calls/day**
- Firestore REST API呼び出しもこれにカウントされる
- クォータ超過時: `Exception: Service invoked too many times in one day: urlfetch`

**解決策:**
```typescript
// ✅ キャッシュの実装（5分TTL）
function getCachedOrFetch(cacheKey: string, fetchFn: () => string): string {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    Logger.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }

  Logger.log(`[Cache MISS] ${cacheKey}`);
  const result = fetchFn();

  // GAS Cache has 100KB limit per key
  if (result.length < 100000) {
    cache.put(cacheKey, result, 300); // 5 minutes TTL
  }

  return result;
}
```

**ページネーションの実装:**
```typescript
// 全件取得ではなく、ページ単位で取得
function api_getCustomersPaginated(page: number, pageSize: number) {
  const cacheKey = `customers_p${page}_s${pageSize}`;
  return getCachedOrFetch(cacheKey, () => {
    // Firestoreから指定ページのみ取得
  });
}
```

**フロントエンドでの楽観的更新:**
```typescript
// 更新後にAPIを再呼び出しせず、ローカルステートを直接更新
const handleUpdate = async (data) => {
  await callGAS('api_updateCustomer', id, data);
  // ❌ await refetch(); // 追加のAPI呼び出し
  // ✅ setLocalData(prev => ({ ...prev, ...data })); // ローカル更新
};
```

**クォータリセット:**
- 日次クォータは **17:00 JST (08:00 UTC)** にリセット
- 開発中にクォータ超過した場合は待機が必要

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

### 3.4 CSVファイルの文字エンコーディング（Shift-JIS問題）

**問題:**
- 日本語CSVファイルの多くはShift-JIS (CP932) でエンコードされている
- Node.js/PowerShellのデフォルトはUTF-8
- そのまま読むと文字化け: `KAN�R�[�h,�֌W����...`

**解決策:**

**PowerShellでの読み込み:**
```powershell
# Shift-JIS (CP932) で読み込み
[System.IO.File]::ReadAllText(
  'path\to\file.csv',
  [System.Text.Encoding]::GetEncoding(932)
)
```

**Node.jsでの読み込み (iconv-lite使用):**
```javascript
const iconv = require('iconv-lite');
const fs = require('fs');

const buffer = fs.readFileSync('path/to/file.csv');
const content = iconv.decode(buffer, 'Shift_JIS');
```

**対象ファイル例:**
- `data/relationship/CRM_V7_Database - RelationshipTypes.csv` (関係性マスター)
- `data/genieeCRM/*.csv` (GENIEEエクスポートデータ)

**エンコーディング判別方法:**
- ファイルをメモ帳で開き「名前を付けて保存」でエンコーディングを確認
- または `file -i filename.csv` (Linux/WSL)

### 4.2 トラブルシューティングチェックリスト

| 症状 | 確認項目 |
|------|----------|
| Method not found | add-bridge.js にブリッジ関数があるか |
| フォーム送信が動かない | Zodスキーマと既存データの整合性 |
| データが更新されない | デプロイメントバージョンが最新か |
| コンソールに警告 | MUIコンポーネントのprops確認 |
| URLFetch exceeded | キャッシュ実装、17:00 JSTまで待機 |
| CSVが文字化け | Shift-JIS (CP932) でエンコードされている可能性 |

## 5. ファイル構成と責務

```
V9/
├── src/main.ts                    # GAS API関数（エントリーポイント）
├── src/services/                  # ビジネスロジック
│   ├── firestore.ts               # Firestore REST API（queryDocuments含む）
│   └── customer_service.ts        # 顧客サービス
├── scripts/add-bridge.js          # GASブリッジ関数（重要！）
├── frontend/src/
│   ├── api/
│   │   ├── client.ts              # GAS呼び出しラッパー
│   │   ├── types.ts               # 型定義（Firestoreスキーマと一致させる）
│   │   └── relationships.ts       # 関係性API & マスターデータ
│   ├── components/
│   │   ├── Customer/              # 顧客関連コンポーネント
│   │   └── Relationship/          # 関係性コンポーネント
│   │       ├── RelationshipList.tsx    # 関係性一覧
│   │       ├── RelationshipForm.tsx    # 追加/編集フォーム
│   │       └── RelationshipResolver.tsx # 手動確認ダイアログ
│   ├── hooks/                     # カスタムフック（API連携等）
│   └── pages/                     # ページコンポーネント
├── data/
│   └── relationship/              # 関係性マスターCSV（Shift-JIS）
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

5. **CSVファイルを読み込む場合**
   - 日本語CSVはほぼShift-JIS（CP932）
   - iconv-liteまたはPowerShellでエンコーディング指定して読込

6. **大量データを扱う場合**
   - キャッシュ実装を検討（`CacheService`）
   - ページネーション実装を検討
   - URLFetch クォータ（20,000/day）に注意

7. **インポートデータを生成する場合（重要）**
   - **Single Source of Truth**: データ生成は1か所で行う
   - 正式データは `migration/output/gas-scripts/` に配置
   - `data/import/` は一時ファイル置き場（コミットしない）
   - スキーマは `src/types/firestore.ts` と一致させる
   - 複数の場所で同じデータを生成しない（競合の原因）

## 7. ドキュメント運用ルール

### 7.1 知見の記録フロー

新しい失敗や知見が得られた場合、以下の手順で記録してください：

```
1. 本ドキュメント (DEVELOPMENT_GUIDE.md) に詳細を追記
   - 問題の症状
   - 原因
   - 解決策
   - コード例（あれば）

2. CURRENT_STATUS.md の変更履歴に記録
   - 日付、Type（FIX/FEATURE/DOCS等）、概要

3. 重要な失敗パターンは PROJECT_MANIFEST.md にも追加
   - 「よくある失敗パターン」テーブルに追記
```

### 7.2 ドキュメント構成と役割

| ドキュメント | 役割 | 更新タイミング |
|-------------|------|----------------|
| `DEVELOPMENT_GUIDE.md` | 開発時の注意点・知見の詳細 | 新しい知見が得られたとき |
| `CURRENT_STATUS.md` | 進捗・完了機能・変更履歴 | 機能完了/問題解決時 |
| `PROJECT_MANIFEST.md` | プロジェクト全体像・鉄則 | アーキテクチャ変更時 |
| `LESSONS_LEARNED_V10_V11.md` | 過去プロジェクトの教訓（参考） | 基本的に更新不要 |

### 7.3 コミット時のルール

知見を記録したら、関連コードと一緒にコミット：

```bash
# 機能実装 + 知見記録を同時にコミット
git add src/main.ts scripts/add-bridge.js docs/DEVELOPMENT_GUIDE.md CURRENT_STATUS.md
git commit -m "feat: Add api_xxx function

- Implement api_xxx in main.ts
- Add bridge function in add-bridge.js
- Document lessons learned in DEVELOPMENT_GUIDE.md"
```

### 7.4 セッション終了時のチェックリスト

開発セッション終了時に以下を確認：

- [ ] 新しい知見があれば `DEVELOPMENT_GUIDE.md` に追記したか
- [ ] `CURRENT_STATUS.md` の変更履歴を更新したか
- [ ] 重要な失敗パターンを `PROJECT_MANIFEST.md` に追加したか
- [ ] Gitコミット・プッシュしたか
- [ ] 最新デプロイバージョンを記録したか

---

*最終更新: 2025-12-04*
*作成者: Claude Code*
