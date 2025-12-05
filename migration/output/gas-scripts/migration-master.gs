/**
 * CRM V9 Migration Master Script (Optimized)
 *
 * Updated: 2025-12-05
 *
 * 最適化ポイント:
 * - batchWrite API使用（500件/1API呼び出し）
 * - 全コレクション対応（Customers, Temples, Staff, Products, Deals）
 * - URLFetchクォータ節約（10,852件 = 22 API呼び出し vs 旧方式 10,852回）
 *
 * 使用方法:
 * 1. Google DriveにJSONファイルをアップロード
 * 2. 各ファイルIDを下記に設定
 * 3. GASエディタで runFullMigration() を実行
 */

// ============================================
// Google Drive上のJSONファイルID（アップロード後に設定）
// ============================================
const CUSTOMERS_FILE_ID = 'YOUR_CUSTOMERS_FILE_ID_HERE';
const TEMPLES_FILE_ID = 'YOUR_TEMPLES_FILE_ID_HERE';
const STAFF_FILE_ID = 'YOUR_STAFF_FILE_ID_HERE';
const PRODUCTS_FILE_ID = 'YOUR_PRODUCTS_FILE_ID_HERE';
const DEALS_FILE_ID = 'YOUR_DEALS_FILE_ID_HERE';

// Firestore設定（Script Propertiesから取得）
function getFirestoreConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    projectId: props.getProperty('FIRESTORE_PROJECT_ID') || 'crm-appsheet-v7',
    databaseId: props.getProperty('FIRESTORE_DATABASE_ID') || 'crm-database-v9',
    email: props.getProperty('FIRESTORE_EMAIL'),
    key: props.getProperty('FIRESTORE_KEY')
  };
}

// ============================================
// Firestore REST API ヘルパー関数
// ============================================

let cachedToken = null;
let tokenExpiry = 0;

/**
 * OAuth 2.0 アクセストークンを取得（キャッシュ対応）
 */
function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry > now + 60) {
    return cachedToken;
  }

  const config = getFirestoreConfig();
  const key = config.key.replace(/\\n/g, '\n');

  const jwtHeader = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
  const jwtClaim = JSON.stringify({
    iss: config.email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });

  const toSign = Utilities.base64EncodeWebSafe(jwtHeader) + '.' + Utilities.base64EncodeWebSafe(jwtClaim);
  const signatureBytes = Utilities.computeRsaSha256Signature(toSign, key);
  const signature = Utilities.base64EncodeWebSafe(signatureBytes);
  const jwt = toSign + '.' + signature;

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to get Access Token: ' + response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  cachedToken = data.access_token;
  tokenExpiry = now + 3600;

  return cachedToken;
}

/**
 * JavaScript値をFirestore形式に変換
 */
function toFirestoreValue(data) {
  const fields = {};
  for (const key in data) {
    const value = data[key];
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(function(v) {
            if (typeof v === 'object' && v !== null) {
              return { mapValue: { fields: toFirestoreValue(v) } };
            } else if (typeof v === 'string') {
              return { stringValue: v };
            } else if (typeof v === 'number') {
              return Number.isInteger(v) ? { integerValue: v.toString() } : { doubleValue: v };
            } else if (typeof v === 'boolean') {
              return { booleanValue: v };
            }
            return { nullValue: null };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreValue(value) } };
    }
  }
  return fields;
}

/**
 * バッチ書き込み（最大500件/回）- API効率最適化の核心
 *
 * @param {string} collection - コレクション名
 * @param {Array} documents - ドキュメント配列 [{id: string, ...data}]
 * @return {Object} 結果 {success: number, errors: string[]}
 */
function batchWriteDocuments(collection, documents) {
  const config = getFirestoreConfig();
  const url = 'https://firestore.googleapis.com/v1/projects/' + config.projectId +
              '/databases/' + config.databaseId + '/documents:batchWrite';

  const BATCH_SIZE = 500; // Firestore batchWrite上限
  const results = { success: 0, errors: [], apiCalls: 0 };

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    const writes = batch.map(function(doc) {
      const docPath = 'projects/' + config.projectId + '/databases/' + config.databaseId +
                      '/documents/' + collection + '/' + doc.id;

      // idフィールドを除いたデータを作成
      const data = {};
      for (const key in doc) {
        if (key !== 'id') {
          data[key] = doc[key];
        }
      }

      return {
        update: {
          name: docPath,
          fields: toFirestoreValue(data)
        }
      };
    });

    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + getAccessToken(),
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ writes: writes }),
        muteHttpExceptions: true,
      });

      results.apiCalls++;

      if (response.getResponseCode() === 200) {
        results.success += batch.length;
        Logger.log('Batch ' + Math.floor(i / BATCH_SIZE) + ': ' + batch.length + ' documents written');
      } else {
        const errorMsg = 'Batch ' + Math.floor(i / BATCH_SIZE) + ' failed: ' + response.getContentText();
        results.errors.push(errorMsg);
        Logger.log(errorMsg);
      }
    } catch (e) {
      results.errors.push('Batch ' + Math.floor(i / BATCH_SIZE) + ' exception: ' + e.message);
      Logger.log('Exception: ' + e.message);
    }

    // レート制限対策（100ms待機）
    Utilities.sleep(100);
  }

  return results;
}

/**
 * Google DriveからJSONファイルを読み込み
 */
function loadJsonFromDrive(fileId) {
  const file = DriveApp.getFileById(fileId);
  const content = file.getBlob().getDataAsString();
  return JSON.parse(content);
}

// ============================================
// インポート関数（各コレクション）
// ============================================

/**
 * 顧客データをインポート（10,852件）
 * API呼び出し: 約22回（従来10,852回）
 */
function importCustomers() {
  Logger.log('=== Importing Customers ===');

  if (CUSTOMERS_FILE_ID === 'YOUR_CUSTOMERS_FILE_ID_HERE') {
    throw new Error('CUSTOMERS_FILE_ID が設定されていません。Google DriveのファイルIDを設定してください。');
  }

  const customers = loadJsonFromDrive(CUSTOMERS_FILE_ID);
  Logger.log('Loaded ' + customers.length + ' customers from Drive');

  const results = batchWriteDocuments('Customers', customers);

  Logger.log('=== Customers Import Complete ===');
  Logger.log('Success: ' + results.success + ', Errors: ' + results.errors.length + ', API Calls: ' + results.apiCalls);

  return results;
}

/**
 * 寺院マスタをインポート（63件）
 * API呼び出し: 1回
 */
function importTemples() {
  Logger.log('=== Importing Temples ===');

  if (TEMPLES_FILE_ID === 'YOUR_TEMPLES_FILE_ID_HERE') {
    throw new Error('TEMPLES_FILE_ID が設定されていません。');
  }

  const temples = loadJsonFromDrive(TEMPLES_FILE_ID);
  Logger.log('Loaded ' + temples.length + ' temples from Drive');

  const results = batchWriteDocuments('Temples', temples);

  Logger.log('=== Temples Import Complete ===');
  Logger.log('Success: ' + results.success + ', API Calls: ' + results.apiCalls);

  return results;
}

/**
 * 担当者マスタをインポート（57件）
 * API呼び出し: 1回
 */
function importStaff() {
  Logger.log('=== Importing Staff ===');

  if (STAFF_FILE_ID === 'YOUR_STAFF_FILE_ID_HERE') {
    throw new Error('STAFF_FILE_ID が設定されていません。');
  }

  const staff = loadJsonFromDrive(STAFF_FILE_ID);
  Logger.log('Loaded ' + staff.length + ' staff from Drive');

  const results = batchWriteDocuments('Staff', staff);

  Logger.log('=== Staff Import Complete ===');
  Logger.log('Success: ' + results.success + ', API Calls: ' + results.apiCalls);

  return results;
}

/**
 * 商品マスタをインポート（66件）
 * API呼び出し: 1回
 */
function importProducts() {
  Logger.log('=== Importing Products ===');

  if (PRODUCTS_FILE_ID === 'YOUR_PRODUCTS_FILE_ID_HERE') {
    throw new Error('PRODUCTS_FILE_ID が設定されていません。');
  }

  const products = loadJsonFromDrive(PRODUCTS_FILE_ID);
  Logger.log('Loaded ' + products.length + ' products from Drive');

  const results = batchWriteDocuments('Products', products);

  Logger.log('=== Products Import Complete ===');
  Logger.log('Success: ' + results.success + ', API Calls: ' + results.apiCalls);

  return results;
}

/**
 * 商談データをインポート（3,651件）
 * API呼び出し: 約8回
 */
function importDeals() {
  Logger.log('=== Importing Deals ===');

  if (DEALS_FILE_ID === 'YOUR_DEALS_FILE_ID_HERE') {
    throw new Error('DEALS_FILE_ID が設定されていません。');
  }

  const deals = loadJsonFromDrive(DEALS_FILE_ID);
  Logger.log('Loaded ' + deals.length + ' deals from Drive');

  const results = batchWriteDocuments('Deals', deals);

  Logger.log('=== Deals Import Complete ===');
  Logger.log('Success: ' + results.success + ', API Calls: ' + results.apiCalls);

  return results;
}

// ============================================
// メイン実行関数
// ============================================

/**
 * 全データをインポート（推奨実行順序）
 *
 * 実行順序:
 * 1. マスタデータ（依存関係なし）: Temples, Staff, Products
 * 2. 顧客データ
 * 3. 商談データ（顧客IDを参照）
 *
 * 総API呼び出し: 約33回（従来 約14,700回）
 */
function runFullMigration() {
  Logger.log('========================================');
  Logger.log('CRM V9 Full Migration (Optimized)');
  Logger.log('========================================');
  Logger.log('Start time: ' + new Date().toISOString());

  const totalResults = {
    temples: null,
    staff: null,
    products: null,
    customers: null,
    deals: null,
    totalApiCalls: 0
  };

  try {
    // Step 1: マスタデータ（並列依存なし）
    Logger.log('\n--- Step 1: Master Data ---');

    totalResults.temples = importTemples();
    totalResults.totalApiCalls += totalResults.temples.apiCalls;

    totalResults.staff = importStaff();
    totalResults.totalApiCalls += totalResults.staff.apiCalls;

    totalResults.products = importProducts();
    totalResults.totalApiCalls += totalResults.products.apiCalls;

    // Step 2: 顧客データ
    Logger.log('\n--- Step 2: Customers ---');
    totalResults.customers = importCustomers();
    totalResults.totalApiCalls += totalResults.customers.apiCalls;

    // Step 3: 商談データ
    Logger.log('\n--- Step 3: Deals ---');
    totalResults.deals = importDeals();
    totalResults.totalApiCalls += totalResults.deals.apiCalls;

  } catch (e) {
    Logger.log('Migration error: ' + e.message);
    throw e;
  }

  // サマリー出力
  Logger.log('\n========================================');
  Logger.log('Migration Summary');
  Logger.log('========================================');
  Logger.log('Temples:   ' + (totalResults.temples ? totalResults.temples.success : 0) + ' records');
  Logger.log('Staff:     ' + (totalResults.staff ? totalResults.staff.success : 0) + ' records');
  Logger.log('Products:  ' + (totalResults.products ? totalResults.products.success : 0) + ' records');
  Logger.log('Customers: ' + (totalResults.customers ? totalResults.customers.success : 0) + ' records');
  Logger.log('Deals:     ' + (totalResults.deals ? totalResults.deals.success : 0) + ' records');
  Logger.log('----------------------------------------');
  Logger.log('Total API Calls: ' + totalResults.totalApiCalls);
  Logger.log('End time: ' + new Date().toISOString());
  Logger.log('========================================');

  return totalResults;
}

/**
 * マスタデータのみインポート（テスト用）
 */
function importMasterDataOnly() {
  Logger.log('=== Master Data Import ===');

  const results = {};
  results.temples = importTemples();
  results.staff = importStaff();
  results.products = importProducts();

  Logger.log('Master data import complete');
  return results;
}

/**
 * 顧客データのみインポート（大量データテスト用）
 */
function importCustomersOnly() {
  return importCustomers();
}

/**
 * 商談データのみインポート
 */
function importDealsOnly() {
  return importDeals();
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * コレクション内のドキュメント数を取得
 */
function getCollectionCount(collection) {
  const config = getFirestoreConfig();
  const url = 'https://firestore.googleapis.com/v1/projects/' + config.projectId +
              '/databases/' + config.databaseId + '/documents/' + collection + '?pageSize=1';

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + getAccessToken()
    },
    muteHttpExceptions: true
  });

  // Note: This only returns if documents exist, not exact count
  // For exact count, would need to iterate or use aggregation
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    return data.documents ? 'Has documents' : '0';
  }
  return 'Error';
}

/**
 * 全コレクションの状態を確認
 */
function checkAllCollections() {
  const collections = ['Customers', 'Temples', 'Staff', 'Products', 'Deals'];

  Logger.log('=== Collection Status ===');
  collections.forEach(function(col) {
    const status = getCollectionCount(col);
    Logger.log(col + ': ' + status);
  });
}

/**
 * 設定確認用
 */
function checkConfig() {
  Logger.log('=== Configuration Check ===');
  Logger.log('CUSTOMERS_FILE_ID: ' + (CUSTOMERS_FILE_ID !== 'YOUR_CUSTOMERS_FILE_ID_HERE' ? 'Set' : 'NOT SET'));
  Logger.log('TEMPLES_FILE_ID: ' + (TEMPLES_FILE_ID !== 'YOUR_TEMPLES_FILE_ID_HERE' ? 'Set' : 'NOT SET'));
  Logger.log('STAFF_FILE_ID: ' + (STAFF_FILE_ID !== 'YOUR_STAFF_FILE_ID_HERE' ? 'Set' : 'NOT SET'));
  Logger.log('PRODUCTS_FILE_ID: ' + (PRODUCTS_FILE_ID !== 'YOUR_PRODUCTS_FILE_ID_HERE' ? 'Set' : 'NOT SET'));
  Logger.log('DEALS_FILE_ID: ' + (DEALS_FILE_ID !== 'YOUR_DEALS_FILE_ID_HERE' ? 'Set' : 'NOT SET'));

  const config = getFirestoreConfig();
  Logger.log('Firestore Project: ' + config.projectId);
  Logger.log('Firestore Database: ' + config.databaseId);
  Logger.log('Service Account: ' + (config.email ? 'Set' : 'NOT SET'));
  Logger.log('Private Key: ' + (config.key ? 'Set' : 'NOT SET'));
}
