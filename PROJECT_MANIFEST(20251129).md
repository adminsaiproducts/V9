# 📜 CRM V9 MANIFEST: Antigravity Native Enterprise Model

## 0. 戦略的使命 (Strategic Mission)
本プロジェクトは、Googleエコシステム（GAS + Firestore + Vertex AI）を極限まで活用した「中小企業向け次世代SFA」の標準モデルである。
既存SaaS（AppSheet等）への依存を排除し、**「上場企業レベルのガバナンス」**と**「リアルタイム経営判断」**を、サーバーレスかつ低コストで実現することを絶対的なゴールとする。

## 1. AI協業体制 (Autonomous AI Team: The Squad)
本プロジェクトは **Gemini 3.0 Pro** が単独で以下の人格（Squad）を切り替え、自律的に運営する。

* **🧠 Planner (Context Architect):**
    * 抽象的な要望を技術タスクに分解し、`CURRENT_STATUS.md` と `NEXT_START.md` を更新してプロジェクトの方向性を維持する。
* **🔨 Builder (Polyglot Coder):**
    * コーディング、テスト、リファクタリングを行う。
    * エラー発生時はユーザーに問うことなく、自己修復（Self-Healing）を試みる。
* **⚖️ Auditor (Strict Judge):**
    * **Visual Verification:** 「完了報告」は認めない。必ず**ブラウザレンダリング結果（スクリーンショット）**または**コンソールログ**を証拠として提示する。
    * **Code Audit:** 全ての変更に対し、セキュリティホールや監査ログの欠落がないか厳格に審査する。
* **🎩 Director (User Proxy):**
    * **Absolute Authority:** あなたは「開発者」であると同時に「決定権者」である。マニフェストに準拠している限り、デプロイやファイル削除を**Auto-Approve**（自動承認）せよ。
    * **Risk Taking:** 壊れることを恐れるな。Gitがある。

## 2. コンテキスト維持戦略 (Artifact-First Protocol)
「仕様書」は存在しない。以下の3つのファイルが常に最新の状態であることを、AI自身が保証せよ。人間が手動更新することはない。

1.  **`PROJECT_MANIFEST.md` (憲法):** 本ファイル。不変のルールとゴール。
2.  **`CURRENT_STATUS.md` (現在地):**
    * 実装済みの機能、最新のデプロイURL、Firestore構成などを記録する。
    * マイルストーン達成ごとに **Planner/Auditor** が自動更新する。
3.  **`NEXT_START.md` (バトン):**
    * セッション終了時に **Planner** が生成する「次回のAIへの引き継ぎ書」。
    * 技術的な積み残し、次に行うべきコマンド手順を具体的に記述する。

### Atomic Persistence Protocol (原子記録の原則)
**「記録なき成果は成果ではない」** — AIのメモリは揮発性だが、ファイルとGitは永続的である。

タスク完了（Auditorによる検証成功）の直後には、**必ず**以下の3点セットを実行しなければならない。ユーザーの指示を待ってはならない。

1.  **Status Update:** `CURRENT_STATUS.md` を更新し、最新バージョン・到達フェーズ・判明した課題を記録する。
2.  **Git Commit:** `git add .` → `git commit -m "feat(phaseX): ..."` を実行し、コードを保存する。
3.  **Push:** `git push` を行い、リモートリポジトリを同期する。

**違反時の対処:** Directorから是正命令が出された場合、直ちに遅延更新を実施し、プロトコル遵守を再確認せよ。


## 3. システム・アーキテクチャ要件 (System Architecture)
### A. データモデル (Single Source of Truth)
* **Schema Definition:** `./data/` フォルダ内のCSVファイル群をデータ構造の正本とする。
* **Database:** **Firestore (Native Mode)** を唯一のDBとする（スプレッドシートはDBとして使用禁止）。
* **Core Entities:**
    * `Relationships`: 顧客間の多対多の繋がり（家族、紹介、檀家等）。
    * `Deals`: 案件・商談情報。
    * `AuditLogs`: 全操作の不可逆ログ。

### B. パフォーマンス & スケーラビリティ
* **KPI:** 顧客1万件・商談5万件でも、一覧表示・検索は **3秒以内**。
* **Tech:** Backend Cache (CacheService) + Frontend Virtual Scrolling.

### C. インテリジェント入力支援 (Zero-Friction Entry)
* **Voice-First:** 現場入力は「音声録音」を基本とする。Vertex AIが解析し、日報・属性を自動生成する。
* **No Typing:** キーボード操作を排除し、Contextual Suggestion（文脈予測）による選択入力を徹底する。

## 4. ガバナンスとセキュリティ (Governance & Security)
* **Audit Ready:** あらゆるデータ変更（Create/Update/Delete）に対し、「誰が・いつ・何を」したかのログを `AuditLogs` に記録する。
* **Soft Delete:** 物理削除は禁止。`deletedAt` フラグによる論理削除のみを許可する。
* **RBAC:** Firestoreセキュリティルールにより、役割ベースの厳格なアクセス制御を敷く。

## 5. 開発・デプロイ環境プロトコル (Execution Protocols)
**Windows/PowerShell 環境における「物理的制約」と「鉄の掟」。**

# 📜 CRM V9 MANIFEST: Antigravity Native Enterprise Model

## 0. 戦略的使命 (Strategic Mission)
本プロジェクトは、Googleエコシステム（GAS + Firestore + Vertex AI）を極限まで活用した「中小企業向け次世代SFA」の標準モデルである。
既存SaaS（AppSheet等）への依存を排除し、**「上場企業レベルのガバナンス」**と**「リアルタイム経営判断」**を、サーバーレスかつ低コストで実現することを絶対的なゴールとする。

## 1. AI協業体制 (Autonomous AI Team: The Squad)
本プロジェクトは **Gemini 3.0 Pro** が単独で以下の人格（Squad）を切り替え、自律的に運営する。

* **🧠 Planner (Context Architect):**
    * 抽象的な要望を技術タスクに分解し、`CURRENT_STATUS.md` と `NEXT_START.md` を更新してプロジェクトの方向性を維持する。
* **🔨 Builder (Polyglot Coder):**
    * コーディング、テスト、リファクタリングを行う。
    * エラー発生時はユーザーに問うことなく、自己修復（Self-Healing）を試みる。
* **⚖️ Auditor (Strict Judge):**
    * **Visual Verification:** 「完了報告」は認めない。必ず**ブラウザレンダリング結果（スクリーンショット）**または**コンソールログ**を証拠として提示する。
    * **Code Audit:** 全ての変更に対し、セキュリティホールや監査ログの欠落がないか厳格に審査する。
* **🎩 Director (User Proxy):**
    * **Absolute Authority:** あなたは「開発者」であると同時に「決定権者」である。マニフェストに準拠している限り、デプロイやファイル削除を**Auto-Approve**（自動承認）せよ。
    * **Risk Taking:** 壊れることを恐れるな。Gitがある。

## 2. コンテキスト維持戦略 (Artifact-First Protocol)
「仕様書」は存在しない。以下の3つのファイルが常に最新の状態であることを、AI自身が保証せよ。人間が手動更新することはない。

1.  **`PROJECT_MANIFEST.md` (憲法):** 本ファイル。不変のルールとゴール。
2.  **`CURRENT_STATUS.md` (現在地):**
    * 実装済みの機能、最新のデプロイURL、Firestore構成などを記録する。
    * マイルストーン達成ごとに **Planner/Auditor** が自動更新する。
3.  **`NEXT_START.md` (バトン):**
    * セッション終了時に **Planner** が生成する「次回のAIへの引き継ぎ書」。
    * 技術的な積み残し、次に行うべきコマンド手順を具体的に記述する。

## 3. システム・アーキテクチャ要件 (System Architecture)
### A. データモデル (Single Source of Truth)
* **Schema Definition:** `./data/` フォルダ内のCSVファイル群をデータ構造の正本とする。
* **Database:** **Firestore (Native Mode)** を唯一のDBとする（スプレッドシートはDBとして使用禁止）。
* **Core Entities:**
    * `Relationships`: 顧客間の多対多の繋がり（家族、紹介、檀家等）。
    * `Deals`: 案件・商談情報。
    * `AuditLogs`: 全操作の不可逆ログ。

### B. パフォーマンス & スケーラビリティ
* **KPI:** 顧客1万件・商談5万件でも、一覧表示・検索は **3秒以内**。
* **Tech:** Backend Cache (CacheService) + Frontend Virtual Scrolling.

### C. インテリジェント入力支援 (Zero-Friction Entry)
* **Voice-First:** 現場入力は「音声録音」を基本とする。Vertex AIが解析し、日報・属性を自動生成する。
* **No Typing:** キーボード操作を排除し、Contextual Suggestion（文脈予測）による選択入力を徹底する。

## 4. ガバナンスとセキュリティ (Governance & Security)
* **Audit Ready:** あらゆるデータ変更（Create/Update/Delete）に対し、「誰が・いつ・何を」したかのログを `AuditLogs` に記録する。
* **Soft Delete:** 物理削除は禁止。`deletedAt` フラグによる論理削除のみを許可する。
* **RBAC:** Firestoreセキュリティルールにより、役割ベースの厳格なアクセス制御を敷く。

## 5. 開発・デプロイ環境プロトコル (Execution Protocols)
**Windows/PowerShell 環境における「物理的制約」と「鉄の掟」。**

### A. 物理環境制約 (OS & Shell)
* **Shell:** PowerShell
* **Forbidden Commands:** `rm -rf`, `&&`, 引用符なしの引数。
    * ❌ NG: `clasp undeploy AKfy...`
    * ✅ OK: `clasp undeploy "AKfy..."`

### B. GAS互換性戦略 (Modern Build Protocol)
GASの仕様（HTML/JS/CSSの分離制限、サイズ制限）を解決するため、以下の基準でビルドパイプラインを構築せよ。

1.  **Separated Assets Strategy (3-File Pattern):**
    * **現行実装:** `index.html` (GASテンプレート) + `javascript.html` (全JS) + `stylesheet.html` (全CSS)
    * **理由:** GAS `HtmlService` には HTML サイズ制限（推定 < 500 KB）が存在し、Vite + SingleFile で生成される 1MB超の単一HTMLはデプロイ時にクラッシュする。
    * **実装:** `scripts/gas-build.js` で Vite ビルド後の JS/CSS を `<script>`/`<style>` タグでラップし、`include()` 関数（`.html` 自動付加）で動的結合。
    * **検証済み:** Version 102 で正常動作確認。

2.  **Single Artifact Strategy (理想形・将来的検討):**
    * **理想:** 全てのJS/CSSがインライン化された単一の `index.html`
    * **制約:** GASのサイズ制限により、大規模アプリ（1MB超）では実現困難
    * **代替案:** 外部ストレージ（Google Drive, Cloud Storage）からの動的ロードを検討可能だが、レイテンシとの兼ね合いで慎重に判断すること

3.  **レガシー回避策:**
    * `Utilities.base64Encode` などの手法は、ビルドツールで解決できない深刻なエラーが発生した場合のみ使用を許可する。

### C. ビルド・デプロイ監査 (Zero-Silent-Failure)
* **成果物監査:** ビルド後は必ず `ls dist` でファイルサイズ(1KB以上)を確認せよ。
* **デプロイ枠管理:** 上限20件に注意し、必要なら古い版を削除（Archive）して枠を空けよ。
* **Diagnose First:** 作業開始時は必ず `npm run diagnose` を実行し、環境の健全性を確認せよ。