const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIST_DIR = path.resolve(__dirname, '../dist');
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXUzpdp7yXX8yeYlXKbNwHNOkbybFn2J-sZckdH1nIg8rC6pYrgoJiuT-3bjpzfVif/exec';
const BATCH_SIZE = 500;

const UPLOAD_TASKS = [
    { collection: 'Temples', file: 'ingested_temples.json', description: '寺院マスタ (64 records)' },
    { collection: 'RelationshipTypes', file: 'ingested_relationships.json', description: '関係性マスタ (49 records)' },
    { collection: 'Customers', file: 'ingested_customers.json', description: '顧客データ (10,840 records)' }
];

async function uploadBatch(collection, items) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ingestData',
                payload: { collection, items }
            })
        });

        const text = await response.text();

        if (!response.ok) {
            console.error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = JSON.parse(text);
        if (result.status !== 'success') {
            throw new Error(`API Error: ${result.message}`);
        }

        return result.data;
    } catch (error) {
        console.error('Batch upload error:', error.message);
        throw error;
    }
}

async function uploadCollection(task) {
    const filePath = path.join(DIST_DIR, task.file);

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${task.file}`);
        return;
    }

    const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\n📤 Uploading ${task.description}...`);
    console.log(`   Total items: ${items.length}`);

    let uploaded = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        try {
            await uploadBatch(task.collection, batch);
            uploaded += batch.length;
            process.stdout.write(`\r   Progress: ${uploaded}/${items.length} (${Math.round(uploaded / items.length * 100)}%)`);
        } catch (error) {
            console.error(`\n❌ Error at batch ${i}-${i + batch.length}:`, error.message);
            throw error;
        }
    }

    console.log(`\n✅ Completed: ${task.description}`);
}

async function main() {
    console.log('🚀 Starting Firestore Upload via GAS Web App');
    console.log(`📍 Target URL: ${WEB_APP_URL}\n`);

    try {
        for (const task of UPLOAD_TASKS) {
            await uploadCollection(task);
        }
        console.log('\n🎉 All data uploaded successfully!');
    } catch (error) {
        console.error('\n💥 Upload failed:', error.message);
        process.exit(1);
    }
}

main();
