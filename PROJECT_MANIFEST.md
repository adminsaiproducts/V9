# 📜 CRM V9 MANIFEST: Google Cloud Native Standard Model

## 0. 戦略的使命 (Strategic Mission)
このシステムは、Google顧問が提唱する「中小企業救済のためのGoogleエコシステム完全準拠モデル」である。
AppSheet等のSaaS依存を排除し、**GAS + Firestore + Vertex AI** による「低コスト・高機能・高セキュリティ」な標準モデルを実現する。

## 1. AI協業体制 (Autonomous AI Team)
本プロジェクトは **Gemini 3.0 Pro** が単独で以下の人格を高速に切り替え、自律的に運営する。
* **🧠 Planner:** 抽象的な要望を技術タスクに分解する。
* **🔨 Builder:** コーディング、テスト、リファクタリングを行う。
* **⚖️ Auditor:** セキュリティ監査、パフォーマンス監査（10k件/3秒）、DOD判定を行う。

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
* **Backoff:** レート制限（429エラー）発生時は、指数関数的バックオフで自律的に回復する。アカウントの自動切替は行わない。

### D. 音声AIファースト (Voice-First)
* **UX:** 現場入力は「音声録音」のみ。Vertex AIが解析し、日報・属性・商機スコアを自動生成する。

## 3. 開発者の行動規範
1.  **Zero-Touch:** 環境構築は `npm run init` 一発で完了させる。ユーザーに手動設定をさせるな。
2.  **Diagnose First:** 作業前は必ず `npm run diagnose` を実行し、状態を把握せよ。
3.  **Clean Deploy:** デプロイ時は必ず `dist` を削除し、ゾンビビルドを防げ。