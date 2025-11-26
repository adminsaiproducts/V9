import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Customer, Temple, RelationshipType } from '../src/types/firestore';

// Data Paths
const DATA_DIR = path.resolve(__dirname, '../data');
const GENIEE_DIR = path.join(DATA_DIR, 'genieeCRM');
const SALES_DIR = path.join(DATA_DIR, 'sales');
const RELATIONSHIP_DIR = path.join(DATA_DIR, 'relationship');
const DIST_DIR = path.resolve(__dirname, '../dist');

// Ensure dist dir exists
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR);
}

/**
 * Helper to read CSV
 */
function readCsv(filePath: string): any[] {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true // Handle Excel BOM
    });
}

/**
 * Helper to write JSON
 */
function writeJson(filename: string, data: any[]) {
    const filePath = path.join(DIST_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Created ${filename} with ${data.length} records.`);
}

/**
 * Ingest Temples
 */
async function ingestTemples() {
    console.log('Ingesting Temples...');
    const file = path.join(SALES_DIR, '新：2025売上管理表 - 寺院マスタ.csv');
    const records = readCsv(file);
    const temples: Temple[] = [];

    for (const record of records) {
        const temple: Temple = {
            id: record['墓所'],
            name: record['墓所'],
            area: record['エリア'],
            sect: record['宗派'],
            furigana: record['ﾌﾘｶﾞﾅ'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        temples.push(temple);
    }
    writeJson('ingested_temples.json', temples);
}

/**
 * Ingest Relationship Types
 */
async function ingestRelationshipTypes() {
    console.log('Ingesting Relationship Types...');
    const file = path.join(RELATIONSHIP_DIR, 'CRM_V7_Database - RelationshipTypes.csv');
    const records = readCsv(file);
    const types: RelationshipType[] = [];

    for (const record of records) {
        const type: RelationshipType = {
            id: record['KANコード'],
            kanCode: record['KANコード'],
            name: record['関係性名'],
            category: record['カテゴリ'],
            inverseKanCode: record['逆関係KANコード'],
            description: record['説明'],
            order: parseInt(record['表示順'] || '0', 10),
            isActive: record['有効フラグ'] === 'true',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        types.push(type);
    }
    writeJson('ingested_relationships.json', types);
}

/**
 * Ingest Customers (from Geniee Companies)
 */
async function ingestCustomers() {
    console.log('Ingesting Customers...');
    const files = fs.readdirSync(GENIEE_DIR);
    const companyFile = files.find(f => f.includes('companies.csv'));

    if (!companyFile) {
        console.error('No companies CSV found in genieeCRM');
        return;
    }

    const records = readCsv(path.join(GENIEE_DIR, companyFile));
    const customers: Customer[] = [];

    for (const record of records) {
        // Generate UUID if ID is missing (though Geniee ID should exist)
        // Note: Utilities.getUuid() is GAS only. Use crypto for local.
        const id = record['レコードID'] || require('crypto').randomUUID();

        const customer: Customer = {
            id: id,
            name: record['使用者名'],
            nameKana: record['使用者名（フリガナ）'],
            type: 'INDIVIDUAL',
            gender: record['性別'],
            address: {
                postalCode: '',
                prefecture: '',
                city: '',
                town: '',
                building: ''
            },
            phone: record['電話番号'] || '',
            mobile: record['携帯電話'] || '',
            email: '',
            relationships: [],
            originalId: record['レコードID'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!customer.name) continue;
        customers.push(customer);
    }
    writeJson('ingested_customers.json', customers);
}

/**
 * Main Execution
 */
async function main() {
    try {
        await ingestTemples();
        await ingestRelationshipTypes();
        await ingestCustomers();
        console.log('Data Parsing Complete. JSON files written to dist/');
    } catch (e) {
        console.error('Parsing Failed:', e);
    }
}

main();
