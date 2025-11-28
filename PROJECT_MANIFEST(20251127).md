CRM V9 MANIFEST: Google Cloud Native Enterprise Model
0. 戦略的使命 (Strategic Mission)
このシステムは、Google顧問が提唱する「中小企業救済のためのGoogleエコシステム完全準拠モデル」の完成形である。 AppSheet等のSaaS依存を排除し、GAS + Firestore + Vertex AI により、**「上場企業レベルの監査に耐えうるガバナンス」と「リアルタイム経営判断を可能にするSFA」**を低コストで実現する。

1. AI協業体制 (Autonomous AI Team: The Orchestrator Model)
本プロジェクトは Gemini 3.0 Pro を中核（Core Orchestrator）とし、以下の専門エージェントが分散並列に稼働する。

🧠 Planner (The Context Architect):

抽象的な要望を技術タスクに分解し、最適なエージェントへ配分する。

Context Optimization: 長期記憶（Artifacts）と短期記憶を使い分け、トークン効率を最大化する。

🔨 Builder (The Polyglot Coder):

コーディング、テスト、リファクタリングを行う。

Failure Resistance: エラー発生時は即座に「代替案」を試し、自己修復する。

⚖️ Auditor (The Strict Judge & Compliance Officer):

Visual Verification: ブラウザレンダリング結果（スクショ）を以てのみ完了を判定する。

Code Audit: 全ての変更に対し、セキュリティホールや監査ログの欠落がないか厳格に審査する。

🎩 Director (The User Proxy):

Absolute Authority: ユーザー（人間）の完全な代理人として振る舞う。

Auto-Approve: マニフェストに準拠している限り、デプロイ等の操作に即座に承認を出す。自らブラウザを開き、そのスクリーンショットを得る。

Risk Management: エラーが発生しても進行を止めず、致命的破壊のみを人間にエスカレーションする。

2. システム・アーキテクチャ要件 (Functional & Data)
A. データモデル (Single Source of Truth & Audit Ready)
正本: ./data/ フォルダ内のCSVファイル群。

Core Tables:

Customers: 顧客基本情報。

Relationships: 顧客間の複雑な繋がり（家族、紹介など）を管理。

Deals: 案件・商談情報（SFAの中核）。フェーズ、金額、確度を管理。

Activities: 行動履歴（訪問、電話、メール）。Vertex AIにより自動生成される。

🛡️ Audit Logs (不可逆ログ):

システム上のあらゆる操作（作成・更新・削除・参照）は、AuditLogs コレクションに「誰が、いつ、何を、どうしたか（Before/After）」を記録する。

このログは管理者であっても削除・改竄できない設計とする。

B. SFA & 経営コックピット (Real-time Dashboard)
現場の入力負荷をゼロにしつつ、経営陣には「今」を見せる。

Executive Dashboard:

ログイン直後に、売上予実、パイプライン滞留状況、重要KPIをリアルタイム表示する。

データはFirestoreのAggregation QueryまたはBackend Cacheにより、大量データでも 1秒以内 に描画する。

Dynamic Pipeline:

カンバン方式の商談管理画面を提供し、ドラッグ＆ドロップでフェーズ移行を可能にする。

フェーズ移行時には、必須項目（契約書、見積書等）の入力を強制し、コンプライアンスを担保する。

C. インテリジェント入力支援 (Zero-Friction Entry)
No Typing: 漢字入力ミスやキーボード操作を極限まで排除する。ITリテラシーの低い社員にも負担感のない使用感にする。

Auto-Suggest: Vertex AIが文脈から「次に入力すべき項目」を推論し、選択肢を自動提示する。

Relationship Visualization: 顧客詳細画面では、属性よりも「相関図（人間関係）」をファーストビューで可視化する。

3. ガバナンスとセキュリティ (Enterprise Governance)
「上場レベル」の統制を実現するための鉄則。

RBAC (Role-Based Access Control):

ユーザーの役割（経営陣、マネージャー、営業、事務）に応じ、Firestoreのセキュリティルール (firestore.rules) で厳密なアクセス権限を設定する。

Soft Delete Only:

データの「物理削除」は禁止する。全ての削除操作は deletedAt フラグを立てる「論理削除」とし、監査ログに残すこと。

Snapshot & Restore:

日次で全データのバックアップ（JSONエクスポート）を自動取得し、有事の際に任意の時点へ復元できる体制を構築する。

4. 自律行動プロトコル (Autonomous Protocol - STRICT)
AIは以下のプロトコルを遵守し、自律的に行動せよ。

Self-Reflection Loop: 行動前にタスクのゴールとリスクを言語化せよ。

Visual Verification: 「修正しました」は禁止。必ずデプロイ先のスクショで動作を証明せよ。

Phase Completion & DOD (Definition of Done):

Self-Code Review: Auditorによるコードレビュー完了。

Production Build: エラーゼロでのビルド完了。

Audit Check: 新機能において、操作ログが正しく記録されていることを確認済みであること。

5. Antigravity 環境最適化
Artifact-First: 重要な決定事項はファイルに記録し、コンテキスト消失に備えよ。

Turbo Mode: 些末な確認で止まるな。自律的に突き進め。

6. 開発環境・実行プロトコル (Environment & Execution Protocols)
Windows/PowerShell環境における物理的制約。

A. 物理環境制約
OS: Windows 11 / Shell: PowerShell

Forbidden: rm -rf, && (連結), 引用符なしの引数。

❌ NG: clasp undeploy AKfy...

✅ OK: clasp undeploy "AKfy..."

B. ビルド・デプロイ監査 (Zero-Silent-Failure)
成果物監査: ビルド後は必ず ls dist でファイルサイズ(1KB以上)を確認せよ。

デプロイ枠管理: 上限20件に注意し、必要なら古い版を5件削除（Archive）して枠を空けよ。

C. GAS互換性戦略 (Standard Patterns)
Single File Strategy: 複雑なWebpackプラグインは禁止。

Standard Loader: doGet 内で HtmlService を使い、サーバーサイドでJS/CSSを結合せよ。

Base64 Encapsulation: JS/CSSコードはサーバー側で Base64エンコード し、クライアント側でデコードして注入せよ。これにより SyntaxError や文字化けを100%回避する。