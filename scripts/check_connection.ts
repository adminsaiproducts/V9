import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/serviceAccount.json');
const DATABASE_ID = 'crm-database-v9'; // User specified database ID

async function main() {
  console.log('🔍 Testing Firestore connection...');

  try {
    // Check if service account exists
    const fs = require('fs');
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    // Initialize Firebase Admin
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    // Connect to specific database
    const db = getFirestore(app, DATABASE_ID);
    
    console.log(`📡 Connecting to Project: ${serviceAccount.project_id}`);
    console.log(`🗄️  Database ID: ${DATABASE_ID}`);

    // Try to list collections to verify access
    const collections = await db.listCollections();
    const collectionNames = collections.map(c => c.id);

    console.log('✅ Connection Successful!');
    console.log(`📂 Existing Collections: ${collectionNames.length > 0 ? collectionNames.join(', ') : '(None)'}`);

    // Write a test document
    const testDocRef = db.collection('SystemChecks').doc('connection_test');
    await testDocRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'connected',
      checkedBy: 'Gemini F'
    });
    console.log('📝 Write Test: Success (SystemChecks/connection_test)');

    // Clean up test document
    await testDocRef.delete();
    console.log('🗑️  Clean Test: Success');

  } catch (error) {
    console.error('❌ Connection Failed:');
    console.error(error);
    process.exit(1);
  }
}

main();