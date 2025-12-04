# CRM V9 Migration Guide

Generated: 2025-12-03T13:33:25.565Z

## データ概要
- 総顧客数: 10852
- バッチサイズ: 50
- 総バッチ数: 218

## 手順

### 1. JSONファイルをGoogle Driveにアップロード
ファイル: `firestore-customers.json` (22.54 MB)

1. Google Driveを開く
2. ファイルをアップロード
3. URLからファイルIDを取得
   - URL例: `https://drive.google.com/file/d/XXXXXXX/view`
   - ファイルID: `XXXXXXX` 部分

### 2. GASエディタで関数を実行
1. GASエディタを開く: https://script.google.com/d/1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ/edit
2. 関数セレクタから選択して実行:

#### Step 1: 既存データを削除
```
migration_deleteAllCustomers
```
- 全ての既存顧客データを削除
- 完了まで数分かかる場合があります

#### Step 2: データをインポート
```javascript
migration_runFullImport('YOUR_FILE_ID')
```
- fileIdを引数として渡す
- GAS実行時間制限（6分）に注意
- タイムアウトする場合は `importBatchRange` を使用

#### Step 3: 確認
```
migration_getCustomerCount
```
- 期待値: 10852

### トラブルシューティング

#### タイムアウトする場合
バッチごとにインポート:
```javascript
// バッチ0-49をインポート (顧客 0-2499)
migration_importFromDrive('FILE_ID', 0, 2500)

// バッチ50-99をインポート (顧客 2500-4999)
migration_importFromDrive('FILE_ID', 2500, 2500)

// 続きを適宜実行
```

#### エラーが発生した場合
1. 実行ログを確認
2. エラーのあった顧客IDを記録
3. 必要に応じて個別に再インポート
