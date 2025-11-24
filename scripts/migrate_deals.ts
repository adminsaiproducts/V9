import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Deal, Customer } from '../src/types/firestore';

// Configuration
const SOURCE_FILE_SALES = path.join(__dirname, '../data/sales/新：2025売上管理表 - 契約詳細.csv');
const CUSTOMERS_FILE = path.join(__dirname, '../dist/migrated_customers.json');
const OUTPUT_FILE = path.join(__dirname, '../dist/migrated_deals.json');

// Helper to clean string
function clean(str: any): string {
  if (!str) return '';
  return String(str).trim();
}

// Helper to parse currency
function parseCurrency(str: any): number {
  const s = clean(str).replace(/[¥,"]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Helper to parse date (YYYY/MM/DD -> ISO)
function parseDate(str: any): Date | undefined {
  const s = clean(str);
  if (!s) return undefined;
  const parts = s.split('/');
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const d = parseInt(parts[2]);
    return new Date(y, m, d);
  }
  return undefined;
}

function formatDate(date: Date): string {
    return date.toISOString();
}

function formatRevenueMonth(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return `${y}年${m.toString().padStart(2, '0')}月`;
}

// Logic to calculate Revenue Month based on Excel formula
// =IFS(R2<>"",TEXT(R2,"yyyy年mm月"),$B2="","",AND(C2="祥雲寺",O2="樹木墓プラン"),TEXT(B2,"yyyy年mm月"),OR(O2="樹木墓プラン",O2="広報"),TEXT(EDATE(B2,-1),"yyyy年mm月"),TRUE,TEXT(B2,"yyyy年mm月"))
function calculateRevenueMonth(record: any): string {
    const completionDateStr = clean(record['工事完了引渡日']); // R
    const contractDateStr = clean(record['契約日']); // B
    const contractor = clean(record['契約者']); // C
    const subCategory = clean(record['小分類']); // O

    const completionDate = parseDate(completionDateStr);
    const contractDate = parseDate(contractDateStr);

    if (completionDate) {
        return formatRevenueMonth(completionDate);
    }

    if (!contractDate) {
        return '';
    }

    // AND(C2="祥雲寺",O2="樹木墓プラン") -> Use Contract Date
    if (contractor === '祥雲寺' && subCategory === '樹木墓プラン') {
        return formatRevenueMonth(contractDate);
    }

    // OR(O2="樹木墓プラン",O2="広報") -> Contract Date - 1 Month
    if (subCategory === '樹木墓プラン' || subCategory === '広報') {
        const prevMonthDate = new Date(contractDate);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        return formatRevenueMonth(prevMonthDate);
    }

    // Default -> Contract Date
    return formatRevenueMonth(contractDate);
}

// Main execution
function main() {
  console.log('Starting deals migration...');

  if (!fs.existsSync(SOURCE_FILE_SALES)) {
    console.error(`Source file not found: ${SOURCE_FILE_SALES}`);
    process.exit(1);
  }

  let customers: Customer[] = [];
  if (fs.existsSync(CUSTOMERS_FILE)) {
      const customersData = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
      customers = JSON.parse(customersData);
  } else {
      console.warn(`Customers file not found: ${CUSTOMERS_FILE}. Deals will not be linked to customers.`);
  }

  // Map Name -> ID for linking
  const customerMap = new Map<string, string>();
  for (const c of customers) {
    customerMap.set(c.name, c.id);
    // Also map by name without spaces for loose matching
    customerMap.set(c.name.replace(/\s+/g, ''), c.id);
  }

  const fileContent = fs.readFileSync(SOURCE_FILE_SALES, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${records.length} sales records.`);

  const deals: Deal[] = [];

  for (const record of records as any[]) {
    const entryOrder = clean(record['入力順']);
    if (!entryOrder) continue;

    const contractorName = clean(record['契約者']);
    const contractDate = parseDate(record['契約日']);
    
    // Try to link customer
    let customerId = '';
    if (contractorName) {
        const exactMatch = customerMap.get(contractorName);
        if (exactMatch) {
            customerId = exactMatch;
        } else {
            const looseMatch = customerMap.get(contractorName.replace(/\s+/g, ''));
            if (looseMatch) {
                customerId = looseMatch;
            }
        }
    }

    // Status Determination logic could be complex, defaulting based on payment
    // "残金" column? If 0, PAID?
    const remaining = parseCurrency(record['残金']);
    let status: Deal['status'] = 'CONTRACTED';
    if (remaining === 0) {
        status = 'PAID';
    } else if (!contractDate) {
        status = 'NEGOTIATION'; // Assume negotiation if no date? Or data issue?
    }

    const deal: Deal = {
      id: `deal_${entryOrder}`, // Use Entry Order for ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: customerId,
      templeId: clean(record['寺院名']), // This should ideally be mapped to Temple IDs, keeping raw name for now
      transactionCategoryId: clean(record['小分類']), // Similarly, keep raw for now or map later
      title: `${clean(record['大分類'])} - ${contractorName}`,
      amount: parseCurrency(record['申込実績']), // Or '入金合計'? Using '申込実績' as Deal Amount
      expectedDate: record['入金日１'] ? parseDate(record['入金日１'])?.toISOString() || '' : '', 
      // Note: expectedDate in Deal schema is required string. 
      // If empty, we might need a fallback or change schema to optional.
      // For now, using contract date or current date as fallback if payment date missing?
      // Schema says: expectedDate: string; // 入金予定日
      // Let's use contract date if no payment date.
      actualDate: parseDate(record['入金日１'])?.toISOString(),
      status: status,
      probability: 100, // It's a sale record, so 100%
      notes: clean(record['備考']) + (clean(record['変更履歴']) ? `\nHistory: ${clean(record['変更履歴'])}` : ''),
    };
    
    // Fix required expectedDate
    if (!deal.expectedDate && contractDate) {
        deal.expectedDate = contractDate.toISOString();
    } else if (!deal.expectedDate) {
        deal.expectedDate = new Date().toISOString();
    }

    // Custom Field: Revenue Month (Store in notes or add to schema later if needed)
    const revenueMonth = calculateRevenueMonth(record);
    if (revenueMonth) {
        deal.notes = `[Revenue Month: ${revenueMonth}]\n${deal.notes || ''}`;
    }

    deals.push(deal);
  }

  // Ensure output directory exists
  const distDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deals, null, 2), 'utf-8');
  console.log(`Migration complete. Processed ${deals.length} records.`);
  console.log(`Linked ${deals.filter(d => d.customerId).length} deals to customers.`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

main();