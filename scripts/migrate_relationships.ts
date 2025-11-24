import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { RelationshipType } from '../src/types/firestore';

// Configuration
const SOURCE_FILE = path.join(__dirname, '../data/relationship/CRM_V7_Database - RelationshipTypes.csv');
const OUTPUT_FILE = path.join(__dirname, '../dist/migrated_relationships.json');

// Helper to clean string
function clean(str: any): string {
  if (!str) return '';
  return String(str).trim();
}

// Helper to parse boolean
function parseBoolean(str: any): boolean {
  const s = clean(str).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

// Helper to parse number
function parseNumber(str: any): number | undefined {
  const n = parseFloat(clean(str));
  return isNaN(n) ? undefined : n;
}

// Main execution
function main() {
  console.log('Starting relationship migration...');

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${records.length} records.`);

  const relationships: RelationshipType[] = [];

  for (const record of records as any[]) {
    const kanCode = clean(record['KANコード']);
    if (!kanCode) continue;

    const relationship: RelationshipType = {
      id: kanCode, // Use KAN Code as Document ID for Master Data
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kanCode: kanCode,
      name: clean(record['関係性名']),
      category: clean(record['カテゴリ']),
      inverseKanCode: clean(record['逆関係KANコード']),
      minThreshold: parseNumber(record['最小閾値']),
      recommendedThreshold: parseNumber(record['推奨閾値']),
      autoApproveThreshold: parseNumber(record['自動承認閾値']),
      description: clean(record['説明']),
      order: parseNumber(record['表示順']) || 999,
      isActive: parseBoolean(record['有効フラグ']),
    };

    relationships.push(relationship);
  }

  // Ensure output directory exists
  const distDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(relationships, null, 2), 'utf-8');
  console.log(`Migration complete. Processed ${relationships.length} records.`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

main();