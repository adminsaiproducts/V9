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

8. **住所データを保存する場合（重要）**
   - 住所はJSON文字列ではなく**オブジェクト**として保存する
   - 詳細は「8. 住所データの正しい構造」セクションを参照

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

## 8. データクリーニング時の注意点（重要）

### 8.1 電話番号パースの正規表現バグ（2025-12-06修正）

**問題:**
`clean-data.ts` の電話番号クリーニング関数で、正規表現のバグにより電話番号の最後の1桁が切り落とされていた。

**症状:**
```
元データ: 045-713-2708
修正前:   045-713-270  ← 最後の「8」が欠落
```

**原因:**
```javascript
// ❌ バグのある正規表現
const phoneWithText = original.match(/^([\d\-\(\)\s]+)(.+)$/);
// この正規表現は「電話番号の最後の1桁」を(.+)にマッチさせてしまう
// 045-713-2708 → グループ1: "045-713-270", グループ2: "8"
```

**修正後:**
```javascript
// ✅ 正しい正規表現
const phoneWithText = original.match(/^([\d\-\(\)\s]+)([^\d\-\(\)\s].*)$/);
// グループ2は「数字・ハイフン以外で始まる」場合のみマッチ
// 045-713-2708 → マッチしない（全体が電話番号として保持）
// 045-123-4567 自宅 → グループ1: "045-123-4567 ", グループ2: "自宅"
```

**影響範囲:**
- 1,055件の典礼責任者顧客（M番号）の電話番号が影響
- `scripts/fix-memorial-customer-phones.js` で修正済み

**再発防止:**
- 正規表現の `(.+)$` は「最低1文字をマッチ」するため、末尾の切り落としに注意
- 電話番号の後にテキストがある場合のみマッチさせる場合は、文字種を指定する

## 9. 住所データの正しい構造（重要）

### 9.1 発生した問題と症状

2025-12-05に典礼責任者顧客（M番号）の住所データで2つの問題が発生：

**問題1: JSON文字列として保存**
```javascript
// ❌ 誤: 文字列として保存
address: '{"zipCode":"232-0063","prefecture":"神奈川県",...}'

// ✅ 正: オブジェクトとして保存
address: { zipCode: "232-0063", prefecture: "神奈川県", ... }
```

**問題2: townフィールドに番地・建物が混入**
```javascript
// ❌ 誤: townに全部入っている
address: {
  town: "南区中里3-3-11　弘明寺パークハイツ107",
  streetNumber: "",
  building: ""
}

// ✅ 正: 正しく分離
address: {
  town: "南区中里",
  streetNumber: "3-3-11",
  building: "弘明寺パークハイツ107"
}
```

### 9.2 原因

住所パース関数が番地部分をtownに含めてしまっていた。
住所文字列「南区中里3-3-11　弘明寺パークハイツ107」から：
- 正しくは: 町名「南区中里」 + 番地「3-3-11」 + 建物「弘明寺パークハイツ107」に分離
- 誤り: 全体を町名として扱った

### 9.3 正しい住所パース方法

```javascript
function parseTownStreetBuilding(str) {
  if (!str) return { town: '', streetNumber: '', building: '' };

  // 全角スペースを半角に変換、ハイフン類を統一
  str = str.replace(/　/g, ' ').replace(/[−ー]/g, '-').trim();

  // パターン1: 「丁目」の後に番地が続く
  // 例: "下瀬谷3丁目16-6 オークレスト瀬谷302"
  const chomePat = /^(.+?[丁目])(\d+[-\d]*)(.*)$/;
  let match = str.match(chomePat);
  if (match) {
    return {
      town: match[1].trim(),
      streetNumber: match[2].replace(/-+$/, '').trim(),
      building: match[3].trim()
    };
  }

  // パターン2: 町名の後に数字（番地）が続く
  // 例: "南区中里3-3-11　弘明寺パークハイツ107"
  const townNumPat = /^([^\d]+?)(\d+[-\d]*)(.*)$/;
  match = str.match(townNumPat);
  if (match) {
    return {
      town: match[1].trim(),
      streetNumber: match[2].replace(/-+$/, '').trim(),
      building: match[3].trim().replace(/^\s+/, '')
    };
  }

  // マッチしない場合はそのままtownに
  return { town: str, streetNumber: '', building: '' };
}
```

### 9.4 Firestoreに保存する際の注意点

```javascript
// ❌ JSON.stringify を使わない
await db.collection('Customers').doc(id).update({
  address: JSON.stringify(addressObj)  // NG!
});

// ✅ オブジェクトをそのまま保存
await db.collection('Customers').doc(id).update({
  address: {
    zipCode: '232-0063',
    prefecture: '神奈川県',
    city: '横浜市',
    town: '南区中里',
    streetNumber: '3-3-11',
    building: '弘明寺パークハイツ107'
  }
});
```

### 9.5 住所データ修正スクリプト

問題が発生した場合の修正スクリプト: `scripts/fix-memorial-customer-addresses.js`

- dry-run モード: `node scripts/fix-memorial-customer-addresses.js --dry-run`
- 本番実行: `node scripts/fix-memorial-customer-addresses.js`

### 9.6 再発防止チェックリスト

新しいデータ移行・顧客作成スクリプトを作成する際：

- [ ] 住所データはオブジェクトとして保存しているか（JSON文字列ではない）
- [ ] 住所パース関数は町名・番地・建物を正しく分離しているか
- [ ] dry-runで数件のデータを確認してから本番実行しているか
- [ ] 保存後にFirestoreコンソールで構造を確認したか

## 10. V10/V11からの教訓（アーカイブ統合）

V10およびV11は開発環境の不安定さにより廃止され、V9が唯一の開発環境となりました。
以下は両プロジェクトから得られた知見です。

### 10.1 GAS :// パターン問題と Base64 エンコーディング

**問題:**
GAS の `HtmlService` は JavaScript コード内の `://` パターン（例: `https://`, `http://`）を JavaScript のコメントとして誤認識し、それ以降のコードを削除してしまう。

**症状:**
- `SyntaxError: Unexpected token ')'`
- JavaScript が途中で切れている
- React アプリが読み込まれない

**解決策:**
JavaScript を Base64 エンコードしてデプロイし、ブラウザ側でデコードして実行する。

```javascript
// gas-build.js での実装例
const jsBase64 = Buffer.from(jsContent, 'utf8').toString('base64');

const jsTemplate = `<script>
(function() {
  var encoded = "${jsBase64}";
  var decoded = atob(encoded);
  var script = document.createElement('script');
  script.textContent = decoded;
  document.head.appendChild(script);
})();
</script>`;
```

**適用条件:**
- JavaScriptに `://` パターンが含まれる場合のみ必要
- 現在のV9ビルドで問題が発生していなければ適用不要

### 10.2 非デフォルトFirestoreデータベースID対応

**問題:**
`FirestoreApp` ライブラリは `(default)` データベースしかサポートしておらず、`crm-database-v9` のような名前付きデータベースには接続できない。

**解決策:**
REST API を直接使用する `FirestoreService` クラスを使用する（V9で実装済み）。

```typescript
// V9/src/services/firestore.ts
const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}`;
```

**注意点:**
- `FirestoreApp` ライブラリは使用しない
- Script Properties で `FIRESTORE_DATABASE_ID` を正しく設定

### 10.3 双方向住所検索API

**郵便番号 → 住所（zipcloud API）:**
```typescript
getAddressByZipCode(zipCode: string) {
  const cleanZipCode = zipCode.replace(/-/g, '');
  const response = UrlFetchApp.fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZipCode}`
  );
  // 結果をパース...
}
```

**住所 → 郵便番号（HeartRails Geo API）:**
- zipcloudは郵便番号→住所の**一方向のみ**
- 住所→郵便番号の逆引きにはHeartRails Geo APIを使用

### 10.4 clasp と OneDrive の相性問題

**問題:**
OneDrive 上での開発では、`.clasp.json` が同期中に破損したり、Script ID が無効になることがある。

**対策:**
1. `.clasp.json` は Git 管理し、変更を追跡
2. Script ID が無効になった場合は手動で復旧
3. 頻繁に新規プロジェクトを作成しない（環境が混乱する）

**V9 の現在のScript ID:**
```json
{"scriptId": "1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ", "rootDir": "dist"}
```

### 10.5 GAS サイズ制限と 3-File Pattern

**制限:**
GAS `HtmlService` には HTML サイズ制限（推定 < 500KB）が存在。

**解決策: 3-File Pattern**
```
dist/
├── index.html          # GAS template with <?!= include() ?>
├── javascript.html     # All JS wrapped in <script>
├── stylesheet.html     # All CSS wrapped in <style>
└── bundle.js           # Backend GAS code
```

### 10.6 V10/V11 廃止の経緯

**V10:**
- Material UI + React Router を追加
- GAS Script ID が繰り返し無効になる問題が発生
- 最終的に開発環境が不安定化

**V11:**
- V9 と V10 のマージを試みた
- FirestoreApp ライブラリの非デフォルトDB非対応問題に直面
- REST API 方式に修正したが、clasp 問題が継続

**結論:**
V9 を唯一の開発環境とし、V10/V11 の知見のみを統合して継続開発することを決定。

**GitHub アーカイブ:**
- https://github.com/adminsaiproducts/V10
- https://github.com/adminsaiproducts/V11

## 11. 大量データ検索の最適化（2025-12-06）

### 11.1 問題と症状

**問題:**
13,673件の顧客データを検索すると、UIが25秒以上フリーズする。

**原因:**
- 毎回サーバーに検索リクエストを送信
- 全データをフィルタリングする際にUIスレッドがブロック

### 11.2 解決策: ハイブリッドキャッシュ + チャンク分割

**1. GAS側: 全顧客一括取得API**
```typescript
// src/main.ts
globalThis.api_getAllCustomers = function(): Customer[] {
  return CustomerService.getAllCustomers();
};
```

**2. フロントエンド側: キャッシュ + バックグラウンド読み込み**
```typescript
// frontend/src/api/customers.ts
let cachedAllCustomers: Customer[] | null = null;

export async function getAllCustomersForSearch(): Promise<Customer[]> {
  if (cachedAllCustomers) return cachedAllCustomers;

  const result = await callGAS<Customer[]>('api_getAllCustomers');
  cachedAllCustomers = result;
  return result;
}
```

**3. チャンク分割フィルタリング（UI非ブロック）**
```typescript
const filterInChunks = async (data: Customer[], query: string): Promise<Customer[]> => {
  const CHUNK_SIZE = 2000;
  const results: Customer[] = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    const chunkResults = chunk.filter(c => /* フィルタ条件 */);
    results.push(...chunkResults);

    // UIスレッドに制御を返す
    if (i + CHUNK_SIZE < data.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return results;
};
```

**4. デバウンス（連続入力対策）**
```typescript
// 300ms デバウンス
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 11.3 結果

| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| 検索時間 | 25秒+ | 即座 |
| UIフリーズ | あり | なし |
| 初回読み込み | 毎回API | 1回のみ |

## 12. 売上ダッシュボードの実装（2025-12-06）

### 12.1 アーキテクチャ

```
[CSV ファイル] → [generate-sales-data.js] → [salesData.ts] → [Dashboard.tsx]
                     ビルド時に実行             TypeScriptモジュール    グラフ・テーブル表示
```

### 12.2 CSVデータの埋め込み

**ビルド前スクリプト:**
```javascript
// scripts/generate-sales-data.js
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const tsContent = `const salesCSVData = ${JSON.stringify(csvContent)};
export default salesCSVData;`;
fs.writeFileSync(OUTPUT_FILE, tsContent);
```

### 12.3 CSV解析とサマリー計算

```typescript
// frontend/src/api/sales.ts
export function parseSalesCSV(csvContent: string): SalesRecord[] {
  // CSVをパース（引用符内のカンマを考慮）
}

export function calculateDashboardSummary(records: SalesRecord[]): SalesDashboardSummary {
  // 総申込額、総入金額、入金率、月次推移、寺院別、エリア別等を計算
}
```

### 12.4 Chart.js によるグラフ表示

**インストール:**
```bash
npm install chart.js react-chartjs-2
```

**登録:**
```typescript
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, ... } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
```

**使用例:**
```typescript
const monthlyChartData = {
  labels: salesSummary.monthlyData.map(d => d.month),
  datasets: [
    { label: '申込額', data: salesSummary.monthlyData.map(d => d.applicationAmount) },
    { label: '入金額', data: salesSummary.monthlyData.map(d => d.paymentAmount) },
  ],
};

<Bar data={monthlyChartData} options={chartOptions} />
```

### 12.5 実装したグラフ

| グラフ | タイプ | データ |
|--------|--------|--------|
| 月次推移 | 棒グラフ | 申込額・入金額の月別推移 |
| 大分類別構成比 | 円グラフ | 樹木墓、広報、その他等 |
| エリア別売上 | 棒グラフ | 神奈川、東京、埼玉、千葉 |
| 寺院別TOP10 | 横棒グラフ | 売上上位10寺院 |

## 13. 2025-12-06 セッションで発生した問題と解決策

### 13.1 電話番号フィールドの型エラー

**問題:**
顧客検索時に `(fe.phone || "").replace is not a function` エラーが発生。

**原因:**
Firestoreから取得した`phone`フィールドが文字列ではなく、オブジェクトや数値の場合があった。

**解決策:**
```typescript
// ❌ エラーが発生するコード
const phone = (c.phone || '').replace(/[-\s]/g, '');

// ✅ 型を確認してから処理
const phoneRaw = c.phone;
const phoneStr = typeof phoneRaw === 'string' ? phoneRaw : (phoneRaw ? String(phoneRaw) : '');
const phone = phoneStr.replace(/[-\s]/g, '');
```

**教訓:**
- Firestoreのデータは必ずしも期待する型とは限らない
- 文字列メソッドを呼ぶ前に `typeof` で型チェックする

### 13.2 GASデプロイメントの更新が反映されない

**問題:**
`clasp push` 後もダッシュボードが古いまま（新しいUIが表示されない）。

**原因:**
- `clasp push` はスクリプトを更新するが、デプロイメントは更新しない
- ユーザーがアクセスしているURLは特定バージョンのデプロイメントを指している

**解決策:**
```bash
# 1. プッシュ
clasp push -f

# 2. 新しいデプロイメントを作成
clasp deploy -d "説明"

# 3. 新しいデプロイメントIDのURLを使用
# 例: https://script.google.com/macros/s/AKfycbwDxTF0n.../exec
```

**教訓:**
- `clasp push` だけでは本番URLは更新されない
- 毎回 `clasp deploy` で新しいバージョンを作成する必要がある
- または既存のデプロイメントを更新: `clasp deploy -i <deployment_id>`

### 13.3 CSVデータが大きすぎてReadツールで読めない

**問題:**
売上CSVファイル（1,422行）がトークン制限（25,000）を超えてReadツールで読めない。

**原因:**
変更履歴列に大量のテキストが含まれており、ファイルサイズが膨張。

**解決策:**
ビルド時にCSVを読み込んでTypeScriptモジュールに変換するスクリプトを作成。

```javascript
// scripts/generate-sales-data.js
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const tsContent = `const salesCSVData = ${JSON.stringify(csvContent)};
export default salesCSVData;`;
fs.writeFileSync(OUTPUT_FILE, tsContent);
```

**教訓:**
- 大きなデータファイルは直接読まず、ビルドスクリプトで処理
- `JSON.stringify` でエスケープすれば安全にTypeScriptに埋め込める

### 13.4 デプロイメント削除による既存URL無効化

**問題:**
`clasp undeploy` で既存デプロイメントを削除したため、ユーザーが使用していたURLが無効になった。

**原因:**
```bash
# これを実行してしまった
clasp undeploy AKfycbz43T-Qgoh3VIvP6dQI8XAwvukF9qoCVtdmhyHRgWXy2eWe1bQ7uAU6FQh6g8-hXM_E
```

**解決策:**
新しいデプロイメントURLをユーザーに共有。

**再発防止:**
```bash
# ❌ 削除してから新規作成（URLが変わる）
clasp undeploy <old_id>
clasp deploy

# ✅ 既存デプロイメントを更新（URLが維持される）
clasp deploy -i <existing_deployment_id> -d "説明"
```

**教訓:**
- 本番で使用中のデプロイメントは削除しない
- 更新する場合は `-i` オプションで既存IDを指定
- 削除する前にユーザーに影響がないか確認

### 13.5 検索時のUIフリーズ

**問題:**
13,673件の顧客を一度にフィルタリングするとUIが固まる。

**原因:**
JavaScriptはシングルスレッドなので、大量データの同期処理中はUIが更新されない。

**解決策:**
チャンク分割 + `setTimeout(0)` でUIスレッドに制御を返す。

```typescript
for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  // チャンク処理...

  // UIスレッドに制御を返す
  if (i + CHUNK_SIZE < data.length) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

**教訓:**
- 大量データ処理は必ずチャンク分割
- `setTimeout(0)` で定期的にUIに制御を返す
- Web Workerも検討（より本格的な場合）

## 14. トラブルシューティングチェックリスト（更新版）

| 症状 | 確認項目 | 解決策 |
|------|----------|--------|
| Method not found | `add-bridge.js` にブリッジ関数があるか | ブリッジ関数を追加 |
| フォーム送信が動かない | Zodスキーマと既存データの整合性 | スキーマに既存値を含める |
| 更新が反映されない | デプロイメントバージョンが最新か | `clasp deploy` で新バージョン作成 |
| URLが無効 | デプロイメントが削除されていないか | 新しいURLを共有 |
| `.replace is not a function` | データ型が期待と異なる | `typeof` で型チェック |
| UIがフリーズ | 大量データの同期処理 | チャンク分割 + setTimeout |
| CSVが読めない | ファイルが大きすぎる | ビルドスクリプトで処理 |
| URLFetch exceeded | GAS日次クォータ超過 | キャッシュ実装、17:00 JSTリセット待ち |

## 15. 売上データ自動生成（2025-12-06追加）

### 15.1 概要

売上ダッシュボードのデータは、以前は手動で管理していた CSV（`新：2025売上管理表 - 契約詳細.csv`）から読み込んでいましたが、**商談データ（Firestore）から自動生成**する方式に変更しました。

### 15.2 データフロー

```
Firestore Deals (3,651件)
    ↓
generate-sales-from-deals.js
    ↓
frontend/src/data/salesData.ts (自動生成)
    ↓
Dashboard.tsx (グラフ表示)
```

### 15.3 スクリプト

| スクリプト | 役割 | 使用状況 |
|-----------|------|----------|
| `scripts/generate-sales-from-deals.js` | 商談データからCSV形式で売上データ生成 | **推奨** |
| `scripts/generate-sales-data.js` | 手動CSVから売上データ生成 | 非推奨（@deprecated） |

### 15.4 実行方法

```bash
# 個別実行
npm run generate:sales

# ビルド時に自動実行（組み込み済み）
npm run build
```

### 15.5 商談-顧客の紐付け

商談データ（Deals）は `customerId` フィールドで顧客と紐付けられています。

```javascript
// Deal構造
{
  id: "DEAL-xxx",
  customerId: "CUST-xxx",    // ← 顧客ID（紐付けキー）
  templeId: "TEMPLE-xxx",
  customerName: "山田太郎",
  planName: "A/区画",
  amount: 350000,
  status: "PAID",            // PAID/CONTRACTED が売上対象
  actualDate: "2025-01-15"   // 契約日
}
```

### 15.6 生成されるCSVカラム

| カラム | ソース | 備考 |
|--------|--------|------|
| 入力順 | 自動採番 | 1から連番 |
| 契約日 | Deal.actualDate | YYYY/MM/DD形式 |
| 契約者 | Deal.customerName | |
| 寺院名 | Temple.name | Deal.templeIdから参照 |
| エリア | Temple.area | Deal.templeIdから参照 |
| 申込実績 | Deal.amount | ¥XX,XXX形式 |
| 入金日/入金額 | Deal.status | PAID時は契約日に全額入金 |
| 小分類 | Deal.planName | プラン名 |
| 大分類 | 自動推定 | planNameから推定（樹木墓/納骨堂/ペット等） |
| 売上計上月 | Deal.actualDate | YYYY年MM月形式 |

### 15.7 大分類の自動推定ロジック

```javascript
const categoryMap = {
  '樹木墓': ['樹木墓', '樹木', 'A/', 'B/', 'C/', 'D/', 'E/'],
  '納骨堂': ['納骨堂', '堂内', '廟'],
  'ペット': ['ペット', 'PR/', 'PET'],
  '墓石': ['墓石', '石碑', '墓誌'],
  '管理料': ['管理料', '年間管理'],
  '法要': ['法要', '読経', '供養'],
  'その他': []
};
```

## 16. 寺院IDフォーマット不一致問題（2025-12-06）

### 16.1 問題と症状

**問題:**
ダッシュボードの「エリア別売上」と「寺院別売上 TOP10」グラフが空になる（データがない）。

**症状:**
- 月次推移グラフや大分類別グラフは正常に表示
- エリア別と寺院別のグラフだけが空
- 生成された `salesData.ts` のファイルサイズが小さい（480KB vs 本来569KB）

### 16.2 原因

`scripts/generate-sales-from-deals.js` が参照していた寺院データと商談データで **IDフォーマットが異なっていた**。

```javascript
// 商談データ (firestore-deals.json) の templeId
{ templeId: "TEMPLE-001", ... }  // TEMPLE-* 形式

// 旧・寺院データ (firestore-temples.json) の ID
{ id: "T0001", ... }  // T0001 形式

// → IDが一致しないため、寺院名・エリアが取得できずスキップされていた
```

### 16.3 解決策

正しいIDフォーマットを持つ寺院データファイルを参照するよう修正。

```javascript
// ❌ 間違ったソース（IDフォーマット不一致）
const TEMPLES_PATH = path.resolve(__dirname, '../migration/output/gas-scripts/firestore-temples.json');

// ✅ 正しいソース（TEMPLE-* 形式のIDを持つ）
const TEMPLES_PATH = path.resolve(__dirname, '../data/import/temples.json');
```

### 16.4 教訓：Single Source of Truth と ID フォーマット

**チェックリスト（データソースを参照するとき）:**

1. [ ] 参照するデータファイルのIDフォーマットを確認
2. [ ] 紐付け先のデータのIDフォーマットと一致しているか確認
3. [ ] 複数のマスタデータがある場合、どれが正式版か確認

**よくあるIDフォーマットの例:**
| データ | フォーマット例 | 注意点 |
|--------|---------------|--------|
| 顧客 | CUST-000001 | 6桁ゼロ埋め |
| 寺院 | TEMPLE-001 | 3桁数字 |
| 寺院（旧） | T0001 | 廃止、使用しない |
| 商談 | DEAL-xxx | 元システムのID |
| 典礼責任者 | M0001〜M1766 | M番号 |

**Single Source of Truth 原則（再掲）:**
- マスタデータは `migration/output/gas-scripts/` を正式版とする
- ただし、IDフォーマットの互換性を必ず確認すること
- 異なるIDフォーマットを持つファイルが混在している場合は注意

## 17. 非同期読み込み中の件数表示（2025-12-06）

### 17.1 問題と症状

**問題:**
顧客一覧画面で、バックグラウンド読み込み中に「全 0 件」と表示される。

**症状:**
- 画面表示直後に「全 0 件」が一瞬表示
- その後、正しい件数に更新される
- ユーザーには「データがない」ように見える

### 17.2 原因

`totalCount` の計算ロジックが、読み込み中の状態を考慮していなかった。

```typescript
// ❌ 問題のあるコード
const totalCount = allCustomers ? allCustomers.length : initialTotal;
// backgroundLoading 中は allCustomers=null、initialTotal=0 となり、結果は 0
```

### 17.3 解決策

読み込み中は `null` を返し、表示側で「読み込み中...」を出す。

```typescript
// ✅ 修正後のコード
const totalCount = allCustomers ? allCustomers.length : (backgroundLoading ? null : initialTotal);

// 表示側
{totalCount === null
    ? '読み込み中...'
    : isSearching
        ? `検索結果: ${displayData.length.toLocaleString()} 件`
        : `全 ${totalCount.toLocaleString()} 件`
}
```

### 17.4 教訓：三つの状態を区別する

非同期データには **3つの状態** がある：

| 状態 | 値 | 表示 |
|------|---|------|
| 読み込み中 | null/undefined | 「読み込み中...」 |
| 読み込み完了（0件） | 0 | 「0 件」 |
| 読み込み完了（N件） | N | 「N 件」 |

**チェックリスト（非同期データの表示）:**
- [ ] 読み込み中の状態を適切に検知しているか
- [ ] null/undefined と 0 を区別しているか
- [ ] ユーザーに適切なフィードバックを提供しているか

---

*最終更新: 2025-12-06*
*作成者: Claude Code*
