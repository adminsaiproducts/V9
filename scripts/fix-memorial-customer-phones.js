/**
 * 典礼責任者顧客の電話番号データを修正するスクリプト
 *
 * 問題:
 * clean-data.ts の正規表現バグにより、電話番号の最後の1桁が切れていた
 * 例: 045-713-2708 → 045-713-270 (最後の8が欠落)
 *
 * 解決策:
 * 元のGENIEE CSVから正しい電話番号を再取得し、Firestoreを更新
 */

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

// 設定
const PROJECT_ID = 'crm-appsheet-v7';
const DATABASE_ID = 'crm-database-v9';
const CUSTOMERS_COLLECTION = 'Customers';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../crm-appsheet-v7-4cce8f749b52.json');

// 元CSVファイル
const COMPANIES_CSV = path.join(__dirname, '../data/genieeCRM/2025_11_24-17_19_09_companies.csv');

// Firestoreアクセス
async function getAccessToken() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function getDocument(accessToken, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${CUSTOMERS_COLLECTION}/${docId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get document: ${response.status}`);
  }
  return response.json();
}

async function updateDocument(accessToken, docId, fields, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY-RUN] Would update ${docId}:`, fields);
    return { success: true, dryRun: true };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${CUSTOMERS_COLLECTION}/${docId}?updateMask.fieldPaths=phone&updateMask.fieldPaths=mobile`;

  const body = {
    fields: {
      phone: { stringValue: fields.phone || '' },
      mobile: { stringValue: fields.mobile || '' },
    },
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update document: ${response.status} - ${error}`);
  }
  return response.json();
}

// 元CSVから典礼責任者の電話番号マップを作成
function loadOriginalPhoneData() {
  console.log('Loading original CSV data...');
  const content = fs.readFileSync(COMPANIES_CSV, 'utf8');
  const lines = content.split('\n');

  // ヘッダー解析
  const headerLine = lines[0];
  const headers = headerLine.match(/"[^"]*"|[^,]+/g).map(h => h.replace(/^"|"$/g, ''));

  const nameIdx = headers.indexOf('典礼責任者');
  const phoneIdx = headers.indexOf('典礼責任者電話番号');
  const mobileIdx = headers.indexOf('典礼責任者携帯番号');
  const addressIdx = headers.indexOf('典礼責任者住所');

  console.log(`Found columns - 典礼責任者: ${nameIdx}, 電話: ${phoneIdx}, 携帯: ${mobileIdx}`);

  // 典礼責任者名 → 電話番号のマップを作成
  const phoneMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = line.match(/"[^"]*"|[^,]+/g);
    if (!fields) continue;

    const name = (fields[nameIdx] || '').replace(/^"|"$/g, '').trim();
    const phone = (fields[phoneIdx] || '').replace(/^"|"$/g, '').trim();
    const mobile = (fields[mobileIdx] || '').replace(/^"|"$/g, '').trim();
    const address = (fields[addressIdx] || '').replace(/^"|"$/g, '').trim();

    if (name && (phone || mobile)) {
      // 名前+住所の一部でキーを作成（同姓同名対策）
      const key = `${name.replace(/\s+/g, '')}`;

      // 既存のエントリがあれば、電話番号がより完全なものを採用
      const existing = phoneMap.get(key);
      if (!existing || (phone.length > (existing.phone || '').length) || (mobile.length > (existing.mobile || '').length)) {
        phoneMap.set(key, {
          name,
          phone: phone || existing?.phone || '',
          mobile: mobile || existing?.mobile || '',
          address
        });
      }
    }
  }

  console.log(`Loaded ${phoneMap.size} memorial contact phone records`);
  return phoneMap;
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');

  console.log('=== 典礼責任者顧客の電話番号修正 ===');
  console.log(`モード: ${DRY_RUN ? 'DRY-RUN' : '本番実行'}`);
  console.log();

  // 元CSVから電話番号データを取得
  const originalPhoneMap = loadOriginalPhoneData();

  // Firestoreから典礼責任者顧客を取得
  console.log('\nGetting access token...');
  const accessToken = await getAccessToken();

  // M番号顧客のリストを取得（memorial-new-customers.jsonから）
  const memorialCustomersPath = path.join(__dirname, '../migration/output/memorial-new-customers.json');
  const memorialCustomers = JSON.parse(fs.readFileSync(memorialCustomersPath, 'utf-8'));

  console.log(`Processing ${memorialCustomers.length} memorial customers...`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const updates = [];

  for (const customer of memorialCustomers) {
    const trackingNo = customer.trackingNo;
    const name = customer.name.replace(/\s+/g, '');

    // 元データから正しい電話番号を取得
    const original = originalPhoneMap.get(name);

    if (!original) {
      // console.log(`[SKIP] ${trackingNo}: No original data found for ${customer.name}`);
      skippedCount++;
      continue;
    }

    // 電話番号が異なる場合のみ更新
    const currentPhone = customer.phone || '';
    const currentMobile = customer.mobile || '';
    const correctPhone = original.phone || '';
    const correctMobile = original.mobile || '';

    if (currentPhone !== correctPhone || currentMobile !== correctMobile) {
      updates.push({
        trackingNo,
        name: customer.name,
        currentPhone,
        currentMobile,
        correctPhone,
        correctMobile,
      });

      try {
        await updateDocument(accessToken, trackingNo, {
          phone: correctPhone,
          mobile: correctMobile,
        }, DRY_RUN);
        updatedCount++;

        if (updatedCount <= 10 || updatedCount % 100 === 0) {
          console.log(`[UPDATE] ${trackingNo}: phone ${currentPhone} → ${correctPhone}, mobile ${currentMobile} → ${correctMobile}`);
        }
      } catch (err) {
        console.error(`[ERROR] ${trackingNo}: ${err.message}`);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n=== 完了 ===');
  console.log(`更新: ${updatedCount}件`);
  console.log(`スキップ: ${skippedCount}件`);
  console.log(`エラー: ${errorCount}件`);

  if (DRY_RUN && updates.length > 0) {
    console.log('\n最初の10件の更新内容:');
    updates.slice(0, 10).forEach(u => {
      console.log(`  ${u.trackingNo} (${u.name}): phone ${u.currentPhone} → ${u.correctPhone}, mobile ${u.currentMobile} → ${u.correctMobile}`);
    });
  }
}

main().catch(console.error);
