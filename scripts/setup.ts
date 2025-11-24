import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Configuration
const REQUIRED_FILES = [
  '.clasp.json',
  '.clinerules',
  'config/serviceAccount.json',
  'src/config.ts',
  'PROJECT_MANIFEST.md'
];

const REQUIRED_DIRS = [
  'src',
  'scripts',
  'config',
  'data'
];

async function checkFileExists(filePath: string): Promise<boolean> {
  const exists = fs.existsSync(path.join(process.cwd(), filePath));
  if (exists) {
    console.log(`✅ File found: ${filePath}`);
  } else {
    console.error(`❌ Missing file: ${filePath}`);
  }
  return exists;
}

async function checkDirExists(dirPath: string): Promise<boolean> {
  const exists = fs.existsSync(path.join(process.cwd(), dirPath));
  if (exists) {
    console.log(`✅ Directory found: ${dirPath}`);
  } else {
    console.error(`❌ Missing directory: ${dirPath}`);
  }
  return exists;
}

async function checkClaspLogin(): Promise<boolean> {
  try {
    const output = execSync('npx clasp login --status', { encoding: 'utf8' });
    if (output.includes('Logged in')) {
      console.log('✅ Clasp: Logged in');
      return true;
    } else {
      console.error('❌ Clasp: Not logged in. Run "npx clasp login"');
      return false;
    }
  } catch (e) {
    console.error('❌ Clasp: Check failed', e);
    return false;
  }
}

async function checkFirestoreConnection(): Promise<boolean> {
  console.log('🔍 Testing Firestore connection...');
  const serviceAccountPath = path.join(process.cwd(), 'config/serviceAccount.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file missing');
    return false;
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    const DATABASE_ID = 'crm-database-v9';

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = getFirestore(admin.app(), DATABASE_ID);
    await db.listCollections();
    console.log('✅ Firestore: Connection Successful');
    return true;
  } catch (error) {
    console.error('❌ Firestore: Connection Failed', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting System Diagnosis & Setup...');
  
  let allPassed = true;

  console.log('\n--- Checking File Structure ---');
  for (const file of REQUIRED_FILES) {
    if (!(await checkFileExists(file))) allPassed = false;
  }
  for (const dir of REQUIRED_DIRS) {
    if (!(await checkDirExists(dir))) allPassed = false;
  }

  console.log('\n--- Checking Environment ---');
  if (!(await checkClaspLogin())) {
    // Warning only, as CI/CD might handle auth differently, but for local dev it's crucial
    console.warn('⚠️  Clasp login check failed. Ensure you are logged in for deployment.');
  }

  console.log('\n--- Checking Database ---');
  if (!(await checkFirestoreConnection())) allPassed = false;

  console.log('\n--- Checking NPM Dependencies ---');
  try {
    execSync('npm list', { stdio: 'ignore' });
    console.log('✅ Dependencies: Installed');
  } catch (e) {
    console.warn('⚠️  Dependencies might be missing. Running "npm install"...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies: Installed via npm install');
    } catch (installError) {
      console.error('❌ Failed to install dependencies');
      allPassed = false;
    }
  }

  console.log('\n---------------------------------');
  if (allPassed) {
    console.log('🎉 System Diagnosis Passed. Ready for Development.');
    process.exit(0);
  } else {
    console.error('💥 System Diagnosis Failed. Please fix the issues above.');
    process.exit(1);
  }
}

main();