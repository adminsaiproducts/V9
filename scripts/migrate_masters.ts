import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Temple, TransactionCategory } from '../src/types/firestore';

// Configuration
const SOURCE_FILE_TEMPLES = path.join(__dirname, '../data/sales/新：2025売上管理表 - 寺院マスタ.csv');
const SOURCE_FILE_CATEGORIES = path.join(__dirname, '../data/sales/新：2025売上管理表 - 売上分類マスタ.csv');
const OUTPUT_FILE_TEMPLES = path.join(__dirname, '../dist/migrated_temples.json');
const OUTPUT_FILE_CATEGORIES = path.join(__dirname, '../dist/migrated_categories.json');

// Helper to clean string
function clean(str: any): string {
  if (!str) return '';
  return String(str).trim();
}

function migrateTemples() {
  if (!fs.existsSync(SOURCE_FILE_TEMPLES)) {
    console.error(`Source file not found: ${SOURCE_FILE_TEMPLES}`);
    return;
  }

  const fileContent = fs.readFileSync(SOURCE_FILE_TEMPLES, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${records.length} temple records.`);

  const temples: Temple[] = [];

  for (const record of records as any[]) {
    const name = clean(record['墓所']);
    if (!name) continue;

    // Create ID from name (sanitize for ID safety)
    const id = `temple_${name}`; // Simple ID strategy

    const temple: Temple = {
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: name,
      area: clean(record['エリア']),
      sect: clean(record['宗派']),
      notes: clean(record['ﾌﾘｶﾞﾅ']) // Store furigana in notes for now
    };

    temples.push(temple);
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE_TEMPLES, JSON.stringify(temples, null, 2), 'utf-8');
  console.log(`Temples migration complete. Processed ${temples.length} records.`);
  console.log(`Output written to: ${OUTPUT_FILE_TEMPLES}`);
}

function migrateCategories() {
  if (!fs.existsSync(SOURCE_FILE_CATEGORIES)) {
    console.error(`Source file not found: ${SOURCE_FILE_CATEGORIES}`);
    return;
  }

  const fileContent = fs.readFileSync(SOURCE_FILE_CATEGORIES, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${records.length} category records.`);

  const categories: TransactionCategory[] = [];

  for (const record of records as any[]) {
    const minor = clean(record['小分類']);
    const major = clean(record['大分類']);
    if (!minor) continue;

    // ID strategy: combination of major and minor to be unique
    const id = `cat_${major}_${minor}`;

    const category: TransactionCategory = {
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      majorCategory: major,
      minorCategory: minor,
    };

    categories.push(category);
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE_CATEGORIES, JSON.stringify(categories, null, 2), 'utf-8');
  console.log(`Categories migration complete. Processed ${categories.length} records.`);
  console.log(`Output written to: ${OUTPUT_FILE_CATEGORIES}`);
}

// Main execution
function main() {
  console.log('Starting masters migration...');
  
  // Ensure output directory exists
  const distDir = path.dirname(OUTPUT_FILE_TEMPLES);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  migrateTemples();
  migrateCategories();
  
  console.log('Masters migration finished.');
}

main();