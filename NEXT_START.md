@workspace
【業務開始: V9 Project Phoenix 始動】

**🔴 CRITICAL: コンテキストのロード**
**作業を開始する前に、必ず以下のファイルを読み込み、V9の使命と「Full Auto Mode」を理解せよ。**
1. **`@file .clinerules`** (Geminiとしての振る舞い・自動承認ルール)
2. **`@file PROJECT_MANIFEST.md`** (V9憲章 & APIリソース戦略)
3. `FULL_CONTEXT_HANDOVER.md` (技術要件)
4. `CURRENT_STATUS.md` (進捗)

---

# 🚀 PROJECT V9: STARTUP ORDER

**To: Gemini F (Roo Code)**
**From: Gemini E**

**Objective:** Initialize CRM V9 Environment (Clean Slate).

## 📥 Development Setup (Zero-Touch)

1.  **Clone & Init:**
    ```bash
    git clone https://github.com/adminsaiproducts/V9.git
    cd V9
    npm run init  # Installs dependencies & checks connection
    ```

2.  **Verify Environment:**
    ```bash
    npm run diagnose
    ```

## 🎯 Next Phase Tasks (Implementation)

1.  **Business Logic Implementation:**
    *   Implement `DealService` with transaction logic.
    *   Implement `TempleService` using `src/types/firestore.ts`.
2.  **Vertex AI Integration:**
    *   Connect `AICacheService` to actual Vertex AI API.
3.  **Frontend Development:**
    *   Develop React/HTML frontend for GAS Web App.

**合言葉:**
「V8を忘れろ。V9だけを見ろ。」