# V10/V11からの教訓 (Lessons Learned)

このドキュメントは、V10およびV11の開発で得られた知見をV9に統合するためのリファレンスです。

## 1. GAS :// パターン問題と Base64 エンコーディング解決策

### 問題
GAS の `HtmlService` は JavaScript コード内の `://` パターン（例: `https://`, `http://`）を JavaScript のコメントとして誤認識し、それ以降のコードを削除してしまう。

### 症状
- `SyntaxError: Unexpected token ')'`
- JavaScript が途中で切れている
- React アプリが読み込まれない

### 解決策
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

### 適用条件
- JavaScriptに `://` パターンが含まれる場合のみ必要
- 現在のV9ビルドで問題が発生していなければ適用不要

## 2. 非デフォルトFirestoreデータベースID対応

### 問題
`FirestoreApp` ライブラリは `(default)` データベースしかサポートしておらず、`crm-database-v9` のような名前付きデータベースには接続できない。

### 解決策
REST API を直接使用する `FirestoreService` クラスを使用する（V9で既に実装済み）。

```typescript
// V9/src/services/firestore.ts が正解
const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}`;
```

### 注意点
- `FirestoreApp` ライブラリは使用しない
- Script Properties で `FIRESTORE_DATABASE_ID` を正しく設定

## 3. 双方向住所検索API

### 郵便番号 → 住所（zipcloud API）
```typescript
getAddressByZipCode(zipCode: string): Array<{ prefecture: string; city: string; address1: string }> {
  const cleanZipCode = zipCode.replace(/-/g, '');
  const response = UrlFetchApp.fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZipCode}`);
  const json = JSON.parse(response.getContentText());

  if (json.status === 200 && json.results) {
    return json.results.map((result: any) => ({
      prefecture: result.address1,
      city: result.address2,
      address1: result.address3
    }));
  }
  return [];
}
```

### 住所 → 郵便番号（Google Maps Geocoding API）
```typescript
getZipCodeByAddress(prefecture: string, city: string, address1?: string): string | null {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY');
  const addressQuery = [prefecture, city, address1].filter(Boolean).join(' ');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&language=ja&region=jp&key=${apiKey}`;

  const response = UrlFetchApp.fetch(url);
  const json = JSON.parse(response.getContentText());

  if (json.status === 'OK' && json.results?.length > 0) {
    const postalCodeComponent = json.results[0].address_components.find(
      (c: any) => c.types.includes('postal_code')
    );
    return postalCodeComponent?.long_name.replace(/-/g, '') || null;
  }
  return null;
}
```

### 必要なScript Properties
- `GOOGLE_MAPS_API_KEY`: Google Maps Geocoding API キー

## 4. clasp と OneDrive の相性問題

### 問題
OneDrive 上での開発では、`.clasp.json` が同期中に破損したり、Script ID が無効になることがある。

### 対策
1. `.clasp.json` は Git 管理し、変更を追跡
2. Script ID が無効になった場合の復旧手順を文書化
3. 頻繁に新規プロジェクトを作成しない（環境が混乱する）

### V9 の現在のScript ID
```json
{"scriptId": "1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ", "rootDir": "dist"}
```

## 5. GAS サイズ制限と 3-File Pattern

### 制限
GAS `HtmlService` には HTML サイズ制限（推定 < 500KB）が存在。

### 解決策: 3-File Pattern
```
dist/
├── index.html          # GAS template with <?!= include() ?>
├── javascript.html     # All JS wrapped in <script>
├── stylesheet.html     # All CSS wrapped in <style>
└── bundle.js           # Backend GAS code
```

## 6. V10/V11 廃止の経緯

### V10
- Material UI + React Router を追加
- GAS Script ID が繰り返し無効になる問題が発生
- 最終的に開発環境が不安定化

### V11
- V9 と V10 のマージを試みた
- FirestoreApp ライブラリの非デフォルトDB非対応問題に直面
- REST API 方式に修正したが、clasp 問題が継続

### 結論
V9 を唯一の開発環境とし、V10/V11 の知見のみを統合して継続開発することを決定。

## 7. 住所データ構造の問題（2025-12-05）

### 問題
典礼責任者顧客（M番号）のデータ移行時に、住所データに2つの問題が発生：

1. **JSON文字列として保存:** 住所オブジェクトが `JSON.stringify()` された文字列として保存された
2. **townフィールドへの混入:** 住所パース関数が番地・建物名を町名フィールドに含めてしまった

### 症状
- CRM画面で住所が表示されない
- 編集画面を開くとデータが消える
- Firestoreコンソールで `address: "{\"zipCode\":\"...\"}"` と表示される

### 原因
```javascript
// 誤: JSON文字列として保存
address: JSON.stringify(addressObj)

// 誤: パース関数が分離しない
function parseAddress(str) {
  return { town: str };  // 全部townに入れてしまう
}
```

### 解決策
1. 住所はオブジェクトとして保存（JSON.stringify不要）
2. 正規表現で町名・番地・建物を正しく分離するパース関数を使用
3. 修正スクリプト `scripts/fix-memorial-customer-addresses.js` で既存データを修正

### 再発防止
- データ移行スクリプト作成時は必ず dry-run で確認
- 保存後にFirestoreコンソールで構造を目視確認
- 詳細は `docs/DEVELOPMENT_GUIDE.md` セクション8を参照

---

*最終更新: 2025-12-05*
*作成者: Claude Code*
