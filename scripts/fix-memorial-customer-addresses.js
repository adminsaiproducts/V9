/**
 * 典礼責任者顧客（M番号）の住所データを修正するスクリプト
 *
 * 問題:
 * 1. 住所がJSON文字列として保存されている（オブジェクトではない）
 * 2. townフィールドに番地や建物名まで含まれている
 *
 * 解決:
 * 1. JSON文字列をオブジェクトに変換
 * 2. 住所を正しくパースしてtown/streetNumber/buildingに分離
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

// Firestoreインスタンス（カスタムデータベース）
const db = admin.firestore();
db.settings({ databaseId: DATABASE_ID });

/**
 * 町村+番地+建物名の文字列をパースする
 * 例: "中里3-3-11　弘明寺パークハイツ107" → { town: "中里", streetNumber: "3-3-11", building: "弘明寺パークハイツ107" }
 */
function parseTownStreetBuilding(str) {
  if (!str) return { town: '', streetNumber: '', building: '' };

  // 全角スペースを半角に変換、ハイフン類を統一
  str = str.replace(/　/g, ' ').replace(/[−ー]/g, '-').trim();

  // 「丁目」の後に番地が続くパターン
  // 例: "下瀬谷3丁目16-6 オークレスト瀬谷302"
  const chomePat = /^(.+?[丁目])(\d+[-\d]*)(.*)$/;
  let match = str.match(chomePat);
  if (match) {
    const town = match[1].trim();
    const streetPart = match[2].replace(/-+$/, '').trim();
    let building = match[3].trim();
    return { town, streetNumber: streetPart, building };
  }

  // 町名の後に番地が続くパターン（区+町名+番地）
  // 例: "南区中里3-3-11　弘明寺パークハイツ107"
  // 例: "中区弁天通2-21-7F"
  const townNumPat = /^([^\d]+?)(\d+[-\d]*)(.*)$/;
  match = str.match(townNumPat);
  if (match) {
    const town = match[1].trim();
    const streetPart = match[2].replace(/-+$/, '').trim();
    let building = match[3].trim();

    // 建物名がスペースで始まっていたら除去
    building = building.replace(/^\s+/, '');

    return { town, streetNumber: streetPart, building };
  }

  // どれもマッチしない場合はそのままtownに
  return { town: str, streetNumber: '', building: '' };
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');

  console.log('=== 典礼責任者顧客の住所データ修正 ===');
  console.log(`モード: ${DRY_RUN ? 'DRY-RUN（実際の更新なし）' : '本番実行'}`);
  console.log();

  // M番号の顧客を取得
  console.log('M番号顧客を取得中...');
  const snapshot = await db.collection(COLLECTION)
    .where('trackingNo', '>=', 'M')
    .where('trackingNo', '<', 'N')
    .get();

  console.log(`取得件数: ${snapshot.size}件\n`);

  let needsUpdate = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  // バッチ処理用
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let addressRaw = data.address;

    // 住所がない場合はスキップ
    if (!addressRaw) {
      skipped++;
      continue;
    }

    // JSON文字列の場合はパース
    let address;
    if (typeof addressRaw === 'string') {
      try {
        address = JSON.parse(addressRaw);
      } catch (e) {
        console.log(`⚠️ JSONパース失敗 [${doc.id}]: ${addressRaw.substring(0, 50)}...`);
        skipped++;
        continue;
      }
    } else {
      address = addressRaw;
    }

    // townを取得
    const town = address.town || '';
    if (!town) {
      // townがない場合でもJSON文字列からオブジェクトへの変換が必要
      if (typeof addressRaw === 'string') {
        needsUpdate++;
        if (!DRY_RUN) {
          batch.update(doc.ref, {
            address: address,
            updatedAt: new Date().toISOString(),
          });
          batchCount++;
        }
        console.log(`[JSON→Object only] ${doc.id} (${data.trackingNo})`);
      } else {
        skipped++;
      }
      continue;
    }

    // townに番地や建物が含まれているか確認
    if (!/\d/.test(town) && !/\s/.test(town)) {
      // 数字もスペースも含まれていない場合
      if (typeof addressRaw === 'string') {
        // JSON文字列からオブジェクトへの変換は必要
        needsUpdate++;
        if (!DRY_RUN) {
          batch.update(doc.ref, {
            address: address,
            updatedAt: new Date().toISOString(),
          });
          batchCount++;
        }
        console.log(`[JSON→Object only] ${doc.id} (${data.trackingNo})`);
      } else {
        skipped++;
      }
      continue;
    }

    needsUpdate++;

    // 住所をパース
    const parsed = parseTownStreetBuilding(town);

    console.log(`---`);
    console.log(`ID: ${doc.id} (${data.trackingNo})`);
    console.log(`  元のtown: "${town}"`);
    console.log(`  → town: "${parsed.town}", streetNumber: "${parsed.streetNumber}", building: "${parsed.building}"`);

    // 更新データを準備
    const newAddress = {
      ...address,
      town: parsed.town,
      streetNumber: parsed.streetNumber || address.streetNumber || '',
      building: parsed.building || address.building || '',
    };

    if (!DRY_RUN) {
      batch.update(doc.ref, {
        address: newAddress,
        updatedAt: new Date().toISOString(),
      });
      batchCount++;

      // バッチサイズに達したらコミット
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n[バッチコミット] ${updated + batchCount}件更新完了`);
        updated += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  // 残りのバッチをコミット
  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    updated += batchCount;
  }

  console.log('\n=== 完了 ===');
  console.log(`総件数: ${snapshot.size}`);
  console.log(`更新対象: ${needsUpdate}件`);
  console.log(`更新完了: ${DRY_RUN ? '0（DRY-RUN）' : updated}件`);
  console.log(`スキップ: ${skipped}件`);

  if (errors.length > 0) {
    console.log(`エラー: ${errors.length}件`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  await admin.app().delete();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
