import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import { performance } from 'perf_hooks';

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/serviceAccount.json');
const DATABASE_ID = 'crm-database-v9';

async function main() {
  console.log('🏎️  Starting Performance Test...');

  try {
    if (!require('fs').existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = getFirestore(app, DATABASE_ID);
    const customersRef = db.collection('Customers');

    // 1. Count Documents (Metadata query)
    console.log('\n📊 Test 1: Count Total Documents');
    const startCount = performance.now();
    const snapshot = await customersRef.count().get();
    const countTime = performance.now() - startCount;
    const totalDocs = snapshot.data().count;
    console.log(`   Result: ${totalDocs} documents`);
    console.log(`   Time: ${countTime.toFixed(2)}ms`);

    if (totalDocs < 10000) {
      console.warn('⚠️  Warning: Data set is less than 10k. Performance test may not be representative.');
    }

    // 2. Simple List Query (Limit 50 - Standard List View)
    console.log('\n📄 Test 2: List View (Limit 50)');
    const startList = performance.now();
    const listSnapshot = await customersRef.limit(50).get();
    const listTime = performance.now() - startList;
    console.log(`   Fetched: ${listSnapshot.size} documents`);
    console.log(`   Time: ${listTime.toFixed(2)}ms`);

    const DOD_THRESHOLD_MS = 3000;
    if (listTime < DOD_THRESHOLD_MS) {
      console.log('   ✅ PASS: Under 3s threshold');
    } else {
      console.error('   ❌ FAIL: Exceeded 3s threshold');
    }

    // 3. Filtered Query (Simulate Search)
    console.log('\n🔍 Test 3: Filtered Query (where type == "INDIVIDUAL" limit 50)');
    const startFilter = performance.now();
    const filterSnapshot = await customersRef.where('type', '==', 'INDIVIDUAL').limit(50).get();
    const filterTime = performance.now() - startFilter;
    console.log(`   Fetched: ${filterSnapshot.size} documents`);
    console.log(`   Time: ${filterTime.toFixed(2)}ms`);


    console.log('\n🏁 Performance Test Complete.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

main();