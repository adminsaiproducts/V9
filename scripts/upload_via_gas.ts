/**
 * Upload JSON data to Firestore via deployed GAS Web App
 * Uses the ingestData endpoint with batchWrite capability
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const DIST_DIR = path.resolve(__dirname, '../dist');
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyTNKdOHR9Cl7yFscjT_MZYoMeY0YZIqAZoqLPhYxxCQCPQB_FoVGg6vX99yi2Y0Cmc/exec';

// Batch size for Firestore batchWrite (max 500 per request)
const BATCH_SIZE = 500;

interface UploadTask {
    collection: string;
    file: string;
    description: string;
}

const UPLOAD_TASKS: UploadTask[] = [
    {
        collection: 'Temples',
        file: 'ingested_temples.json',
        description: '寺院マスタ (64 records)'
    },
    {
        collection: 'RelationshipTypes',
        file: 'ingested_relationships.json',
        description: '関係性マスタ (49 records)'
    },
    {
        collection: 'Customers',
        file: 'ingested_customers.json',
        description: '顧客データ (10,840 records)'
    }
];

/**
 * Upload a batch of items to Firestore
 */
async function uploadBatch(collection: string, items: any[]): Promise<void> {
    const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'ingestData',
            payload: {
                collection: collection,
                items: items
            }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    if (result.status !== 'success') {
        throw new Error(`Upload failed: ${result.message}`);
    }

    return result.data;
}

/**
 * Upload all items from a JSON file in batches
 */
async function uploadCollection(task: UploadTask): Promise<void> {
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
            console.error(`\n❌ Error uploading batch ${i}-${i + batch.length}:`, error);
            throw error;
        }
    }

    console.log(`\n✅ Completed: ${task.description}`);
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Firestore Upload via GAS Web App');
    console.log(`📍 Target URL: ${WEB_APP_URL}\n`);

    try {
        for (const task of UPLOAD_TASKS) {
            await uploadCollection(task);
        }

        console.log('\n🎉 All data uploaded successfully!');
    } catch (error) {
        console.error('\n💥 Upload failed:', error);
        process.exit(1);
    }
}

main();
