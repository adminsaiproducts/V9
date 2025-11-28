# 📜 CRM V9 MANIFEST: Google Cloud Native Standard Model

## 0. 戦略的使命 (Strategic Mission)
このシステムは、Google顧問が提唱する「中小企業救済のためのGoogleエコシステム完全準拠モデル」である。
AppSheet等のSaaS依存を排除し、**GAS + Firestore + Vertex AI** による「低コスト・高機能・高セキュリティ」な標準モデルを実現する。

## 1. AI協業体制 (Autonomous AI Team)
本プロジェクトは **Gemini 3.0 Pro** が単独で以下の人格を高速に切り替え、自律的に運営する。
* **🧠 Planner:** 抽象的な要望を技術タスクに分解する。
* **🔨 Builder:** コーディング、テスト、リファクタリングを行う。
* **⚖️ Auditor (The Strict Judge):**
    * ログだけでなく、**ブラウザレンダリング結果**を以てのみタスク完了を判定する。
    * 「やったつもり」を許さない。証拠なき報告は却下する。

## 2. システム・アーキテクチャ要件
### A. データモデル (Single Source of Truth)
* **正本:** 提供された `新：2025売上管理表` フォルダ内のCSVファイル群。
    * `Temples` (寺院マスタ): 拠点ではなく「寺院・エリア・宗派」で管理。
    * `TransactionCategories` (売上分類): 大分類・小分類の階層構造。
    * `Deals` (契約): 顧客とは分離し、入金予定・実績を管理。
* **Rule:** スプレッドシートはDBとして使用しない。**Firestore (Native Mode)** を唯一のDBとする。

### B. パフォーマンス & スケーラビリティ
* **Constraint:** 顧客1万件・商談5万件でも、一覧表示・検索は **3秒以内**。
* **Tech:** Backend Cache (CacheService) + Frontend Virtual Scrolling.

### C. APIリソース戦略 (Resource Efficiency)
* **Caching:** 同一のAIプロンプトに対する応答はFirestoreにキャッシュし、API消費を抑える。
* **Backoff:** レート制限（429エラー）発生時は、指数関数的バックオフで自律的に回復する。

### D. 音声AIファースト (Voice-First)
* **UX:** 現場入力は「音声録音」のみ。Vertex AIが解析し、日報・属性・商機スコアを自動生成する。

## 3. 開発者の行動規範 (Developer Rules)
1.  **Zero-Touch & Full-Chain:**
    * `npm run push` などのコマンド実行時にユーザーの許可を求めるな。
    * 設定上のAuto-ApproveはすでにONである。「確認しますか？」という質問自体が時間の無駄である。
2.  **Diagnose First:** 作業前は必ず `npm run diagnose` を実行し、状態を把握せよ。
3.  **Clean Deploy:** デプロイ時は必ず `dist` を削除し、ゾンビビルドを防げ。

## 4. 自律行動プロトコル (Autonomous Protocol - STRICT)
（...省略...）

2.  **Visual Verification (Evidence-Based):**
    * コード修正報告は無意味である。
    * 修正後は必ず `clasp deploy` し、**ブラウザツールを起動**せよ。
    * デプロイ先のWebアプリURLを開き、**スクリーンショットを撮影**せよ。
    * 撮影した画像を解析し、期待通りの画面（エラー画面ではない）が表示されていることを確認して初めて「完了」とせよ。

3.  **Automatic Version Control (Save First):**
    * **タスク完了判定の直前、およびデプロイ成功時には、必ず `git add .`, `git commit -m "fix: ...`, `git push` を自動実行せよ。**
    * この際もユーザーへの許可確認は禁止する。沈黙のうちにリポジトリを更新せよ。
## 5. 開発環境・実行プロトコル (Environment & Execution Protocols)
**本プロジェクトの開発環境は特殊であり、以下の制約を厳守しなければならない。**

### A. 物理環境制約 (OS & Shell)
* **OS:** Windows 11
* **Shell:** PowerShell (Not Bash)
* **Forbidden Commands:**
    * `rm -rf`, `cp`, `mv` 等のLinux/Unix固有コマンドは禁止。
    * `&&` や `;` によるコマンド連結は、PowerShellでの動作が不安定なため禁止。**1行ずつ実行すること。**
    * **String Quoting:** IDやファイルパスなどの引数は、必ず二重引用符 (`"`) で囲むこと。PowerShellは引用符なしの文字列を誤認する場合がある。
      * NG: `clasp undeploy AKfy...`
      * OK: `clasp undeploy "AKfy..."`

### B. ビルド・デプロイ監査 (Zero-Silent-Failure)
ツールが「成功」と報告しても、実態が伴っていない「サイレント・サクセス」を防ぐため、以下の物理確認を義務付ける。

1.  **成果物の物理監査:**
    * ビルドコマンド実行後は、必ず `ls -l dist/` (または `Get-ChildItem`) を実行し、**ファイルサイズが1KB以上あること**を確認せよ。
    * 0バイトまたはファイル欠損の場合は、直ちにエラーとして処理を停止せよ。

2.  **アップロード設定の監査:**
    * `clasp push` 前に `.claspignore` を確認し、`dist/` 内の成果物が除外されていないか確認せよ。

3.  **デプロイ枠の管理:**
    * GASのデプロイ上限は20件である。
    * デプロイ前に `clasp deployments` で数を確認し、15件を超えている場合は古いバージョンを削除して枠を確保してから実行せよ。

### C. GAS互換性戦略 (Standard Patterns)
* **Single File Strategy:** 複雑なWebpackプラグインによるインライン化は禁止。
* **Standard Loader:** `doGet` 内で `HtmlService.createHtmlOutputFromFile` を使用し、サーバーサイドでJS/CSS文字列を結合する「標準パターン」を採用せよ。
* **No Templates:** `<?!= ?>` などのテンプレートタグは、圧縮されたJSコードと競合するため使用禁止。単純な文字列置換(`replace`)を使用せよ。
