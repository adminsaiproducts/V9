import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Customer } from '../src/types/firestore';

// Configuration
const SOURCE_FILE = path.join(__dirname, '../data/genieeCRM/2025_11_24-17_19_09_companies.csv');
const OUTPUT_FILE = path.join(__dirname, '../dist/migrated_customers.json');

// Helper to determine entity type
function determineEntityType(name: string): 'CORPORATION' | 'INDIVIDUAL' {
  const corporateKeywords = ['株式会社', '有限会社', '合同会社', '社団法人', '財団法人', '宗教法人', '合資会社'];
  if (corporateKeywords.some(keyword => name.includes(keyword))) {
    return 'CORPORATION';
  }
  return 'INDIVIDUAL';
}

// Helper to clean string
function clean(str: any): string {
  if (!str) return '';
  return String(str).trim();
}

// Main execution
function main() {
  console.log('Starting migration...');

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

  const customers: Customer[] = [];
  const customerMap = new Map<string, Customer>(); // Map original ID to Customer
  const namePhoneMap = new Map<string, string>(); // Map "Name_Phone" to ID for relationship lookup

  // Pass 1: Create Customer objects
  for (const record of records as any[]) {
    const id = clean(record['レコードID']) || `generated_${Math.random().toString(36).substr(2, 9)}`;
    const name = clean(record['使用者名']);
    
    // Address Construction
    const prefecture = clean(record['都道府県']);
    const city = clean(record['市区']);
    const town = clean(record['町村']) + clean(record['番地']);
    const building = clean(record['建物名']);

    const customer: Customer = {
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: name,
      nameKana: clean(record['使用者名（フリガナ）']),
      type: determineEntityType(name),
      phone: clean(record['電話番号']),
      mobile: clean(record['携帯番号']),
      email: clean(record['e-mail']),
      address: {
        postalCode: clean(record['郵便番号']),
        prefecture: prefecture,
        city: city,
        town: town,
        building: building,
      },
      relationships: [], // Populated in Pass 2
      originalId: id,
      notes: clean(record['備考']),
    };

    customers.push(customer);
    customerMap.set(id, customer);
    
    // Create lookup keys
    if (name) {
      // Key: Name (Simple)
      namePhoneMap.set(name, id);
      
      // Key: Name + Phone (More specific)
      if (customer.phone) namePhoneMap.set(`${name}_${customer.phone}`, id);
      if (customer.mobile) namePhoneMap.set(`${name}_${customer.mobile}`, id);
    }
  }

  // Pass 2: Infer Relationships
  console.log('Inferring relationships...');
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const record = records[i] as any; // Corresponding CSV record

    // 1. 典礼責任者 (Funeral Director / Responsible Person)
    const respName = clean(record['典礼責任者']);
    const respRelation = clean(record['典礼責任者続柄']);
    
    if (respName && respName !== customer.name) {
      // Try to find this person in our customer list
      let linkedId = namePhoneMap.get(respName);
      
      // If we found a link, add it
      if (linkedId && linkedId !== customer.id) {
        customer.relationships.push({
          relatedCustomerId: linkedId,
          relationType: respRelation || '典礼責任者',
          description: 'From 典礼責任者 field',
        });
      } else {
        // If not found as a customer, we currently just note it in description or ignore?
        // Requirement says "populate 'Related Customer' ... fields".
        // If the related person doesn't exist as a customer, we strictly can't fill `relatedCustomerId` 
        // with a valid ID unless we create a stub customer.
        // For now, we append to notes if not linked, to preserve data.
        if (!customer.notes) customer.notes = '';
        customer.notes += `\n[System] 典礼責任者: ${respName} (${respRelation})`;
      }
    }

    // 2. Shared Address Detection (Simple matching)
    // Only check if address is complete enough
    if (customer.address.prefecture && customer.address.city && customer.address.town) {
      const fullAddress = `${customer.address.prefecture}${customer.address.city}${customer.address.town}${customer.address.building || ''}`;
      
      // Find others with same address
      // (This is O(N^2) naive, but ok for small datasets. For large, use a Map<Address, ID[]>)
    }
  }

  // Optimize Shared Address Detection
  const addressMap = new Map<string, string[]>();
  for (const c of customers) {
    if (c.address.prefecture && c.address.city && c.address.town) {
        const fullAddress = `${c.address.prefecture}${c.address.city}${c.address.town}${c.address.building || ''}`;
        if (!addressMap.has(fullAddress)) {
            addressMap.set(fullAddress, []);
        }
        addressMap.get(fullAddress)?.push(c.id);
    }
  }

  for (const [addr, ids] of addressMap.entries()) {
      if (ids.length > 1) {
          // We have shared addresses
          for (const id1 of ids) {
              const c1 = customerMap.get(id1);
              if (!c1) continue;
              
              for (const id2 of ids) {
                  if (id1 === id2) continue;
                  // Avoid duplicates
                  if (c1.relationships.some(r => r.relatedCustomerId === id2)) continue;

                  c1.relationships.push({
                      relatedCustomerId: id2,
                      relationType: '同居・同一住所',
                      description: 'Auto-detected by shared address',
                  });
              }
          }
      }
  }

  // Ensure output directory exists
  const distDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(customers, null, 2), 'utf-8');
  console.log(`Migration complete. Processed ${customers.length} records.`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

main();