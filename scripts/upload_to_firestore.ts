import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/serviceAccount.json');
const DATABASE_ID = 'crm-database-v9';
const MIGRATED_FILES = [
  { col: 'Temples', file: '../dist/ingested_temples.json' },
  { col: 'RelationshipTypes', file: '../dist/ingested_relationships.json' },
  { col: 'Customers', file: '../dist/ingested_customers.json' },
];

// Initialize Firebase Admin
function initializeFirebase() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    return false;
  }

  try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    // Check if it's our mock file
    if (serviceAccount.private_key && serviceAccount.private_key.includes('MOCK_PRIVATE_KEY')) {
      console.warn('⚠️  Mock Service Account detected. Upload skipped (Simulated Mode).');
      return false;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return true;
  } catch (e) {
    console.error('Failed to initialize Firebase:', e);
    return false;
  }
}

async function uploadCollection(collectionName: string, filePath: string, db: admin.firestore.Firestore) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}. Skipping ${collectionName}.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  console.log(`Uploading ${data.length} records to ${collectionName}...`);

  const batchSize = 500; // Firestore batch limit
  let batch = db.batch();
  let count = 0;
  let total = 0;

  for (const item of data) {
    if (!item.id) continue; // Skip if no ID

    const docRef = db.collection(collectionName).doc(item.id);
    batch.set(docRef, item);
    count++;

    if (count >= batchSize) {
      await batch.commit();
      console.log(`  Committed batch of ${count} records.`);
      batch = db.batch();
      total += count;
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    total += count;
    console.log(`  Committed remaining ${count} records.`);
  }

  console.log(`✅ Completed ${collectionName}: ${total} records uploaded.`);
}

async function main() {
  console.log('🚀 Starting Firestore Upload Process...');

  if (!initializeFirebase()) {
    console.log('🛑 Upload aborted due to missing or mock credentials.');
    console.log('   (This is expected in the initial setup/mock environment)');
    return;
  }

  const db = getFirestore(admin.app(), DATABASE_ID);

  for (const task of MIGRATED_FILES) {
    await uploadCollection(task.col, task.file, db);
  }

  console.log('🎉 All uploads finished.');
}

main().catch(console.error);