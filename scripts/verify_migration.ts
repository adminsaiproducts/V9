import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/serviceAccount.json');
const DATABASE_ID = 'crm-database-v9';

async function main() {
  console.log('🔍 Verifying Migration Results...');

  try {
    if (!require('fs').existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = getFirestore(app, DATABASE_ID);

    // Expected Counts (approximate based on upload logs)
    const collections = [
      { name: 'RelationshipTypes', expected: 49 },
      { name: 'Customers', expected: 10852 },
      { name: 'Deals', expected: 999 },
      { name: 'Temples', expected: 63 },
      { name: 'TransactionCategories', expected: 14 }
    ];

    console.log(`\n📊 Checking Collection Counts (Database: ${DATABASE_ID})...`);
    
    for (const col of collections) {
      const snapshot = await db.collection(col.name).count().get();
      const count = snapshot.data().count;
      
      const status = count >= col.expected ? '✅ OK' : '⚠️  WARNING';
      console.log(`${status} - ${col.name}: ${count} records (Expected: ~${col.expected})`);
    }

    console.log('\n🕵️  Sampling Data...');
    
    // Sample Customer
    const customerSnapshot = await db.collection('Customers').limit(1).get();
    if (!customerSnapshot.empty) {
      console.log('Customer Sample:', JSON.stringify(customerSnapshot.docs[0].data(), null, 2));
    }

    console.log('\n✨ Verification Complete.');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();