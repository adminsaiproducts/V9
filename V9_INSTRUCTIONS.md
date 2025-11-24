# V9 Development Factory: Rules

## 1. Isolation Policy
* 作業は全て `V9` ディレクトリ内で行うこと。
* 既存の `gas` フォルダや `node_modules` は一切参照しないこと。

## 2. Zero-Touch Policy
* ユーザーに「設定」をさせるな。スクリプトで自動化せよ。
* `npm run init` で `clasp login` 以外の全て（依存関係、Config生成、Firestore初期化案内）を完了させること。

## 3. Robustness Policy
* **API Wrapper:** AI APIを呼ぶ際は、必ず「キャッシュ確認」と「再試行ロジック」を含むラッパー関数を通すこと。