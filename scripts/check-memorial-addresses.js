/**
 * 典礼責任者顧客の住所データ構造を確認するスクリプト
 */

const admin = require('firebase-admin');
const path = require('path');

// プロジェクト設定
const PROJECT_ID = 'crm-appsheet-v7';
const DATABASE_ID = 'crm-database-v9';
const COLLECTION = 'Customers';

// サービスアカウントキーのパス
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../crm-appsheet-v7-4cce8f749b52.json');

// Firebase Admin SDKを初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT_PATH),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();
db.settings({ databaseId: DATABASE_ID });

async function main() {
  console.log('=== 典礼責任者顧客の住所データ確認 ===\n');

  // M番号の顧客を取得
  const snapshot = await db.collection(COLLECTION)
    .where('trackingNo', '>=', 'M')
    .where('trackingNo', '<', 'N')
    .limit(20)
    .get();

  console.log(`取得件数: ${snapshot.size}件\n`);

  let withAddress = 0;
  let withTown = 0;
  let townWithDigit = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const address = data.address;

    console.log('---');
    console.log(`ID: ${doc.id}`);
    console.log(`trackingNo: ${data.trackingNo}`);
    console.log(`name: ${data.name}`);
    console.log(`address: ${JSON.stringify(address, null, 2)}`);

    if (address) {
      withAddress++;
      if (address.town) {
        withTown++;
        if (/\d/.test(address.town)) {
          townWithDigit++;
          console.log(`  ⚠️ townに数字が含まれています: "${address.town}"`);
        }
      }
    }
    console.log();
  }

  console.log('\n=== 統計 ===');
  console.log(`住所あり: ${withAddress}件`);
  console.log(`townあり: ${withTown}件`);
  console.log(`townに数字含む: ${townWithDigit}件`);

  await admin.app().delete();
}

main().catch(console.error);
