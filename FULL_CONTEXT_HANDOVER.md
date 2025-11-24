# 🚀 CRM V9: Technical Context

## 1. Why V9? (The Failure of V8)
* **Root Cause:** Spreadsheet as Database & Naive API usage.
* **Result:** Timeouts at 10k rows, Data inconsistency, Rate limit errors.
* **Lesson:** **Firestore + API Caching is mandatory.**

## 2. V9 Data Model (The Truth)
* Derived from `新：2025売上管理表` CSVs.
* **Structures:**
    * `Temples` (Not Branches): Defined by `寺院マスタ.csv`.
    * `TransactionCategories`: Defined by `売上分類マスタ.csv`.
    * `Deals` (Linked to Temples & Customers): Defined by `契約詳細.csv`.
    * `Expenses`: For Real-time Cashflow management.