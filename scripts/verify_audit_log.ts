import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/serviceAccount.json');
const DATABASE_ID = 'crm-database-v9';
const COLLECTION_NAME = 'AuditLogs';

async function main() {
  console.log('🕵️  Verifying Audit Log Capability...');

  try {
    if (!require('fs').existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = getFirestore(app, DATABASE_ID);

    // 1. Create a Test Audit Log
    const testLogId = 'test_audit_verification';
    const testLogData = {
      operation: 'CREATE',
      collection: 'SystemChecks',
      documentId: 'verification_test',
      userId: 'system_verifier',
      timestamp: new Date().toISOString(),
      details: { test: true, verifiedBy: 'Gemini F' },
      userAgent: 'Node.js Verification Script'
    };

    console.log(`📝 Writing test log to ${COLLECTION_NAME}/${testLogId}...`);
    await db.collection(COLLECTION_NAME).doc(testLogId).set(testLogData);
    console.log('✅ Write Success');

    // 2. Read it back
    console.log(`📖 Reading back log...`);
    const doc = await db.collection(COLLECTION_NAME).doc(testLogId).get();
    
    if (!doc.exists) {
      throw new Error('Audit Log document not found after write!');
    }

    const data = doc.data();
    console.log('✅ Read Success:', JSON.stringify(data, null, 2));

    if (data?.operation !== 'CREATE' || data?.userId !== 'system_verifier') {
      throw new Error('Data mismatch in Audit Log!');
    }

    // 3. Clean up
    console.log(`🗑️  Cleaning up...`);
    await db.collection(COLLECTION_NAME).doc(testLogId).delete();
    console.log('✅ Cleanup Success');

    console.log('\n✨ Audit Log Verification Complete.');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();