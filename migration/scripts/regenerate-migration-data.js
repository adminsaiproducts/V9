/**
 * マスタデータをFirestore正式スキーマに合わせて再生成
 *
 * 正式スキーマ: src/types/firestore.ts
 *
 * 対象:
 * - temples.json → firestore-temples.json
 * - staff.json → firestore-staff.json (Staffコレクション追加)
 * - products.json → firestore-products.json (Productsコレクション追加)
 * - deals.json → firestore-deals.json
 */

const fs = require('fs');
const path = require('path');

const DATA_IMPORT_DIR = path.resolve(__dirname, '../../data/import');
const OUTPUT_DIR = path.resolve(__dirname, '../output/gas-scripts');

// 出力ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 マスタデータをFirestoreスキーマに合わせて再生成\n');

// ============================================
// 1. 寺院マスタ (Temples)
// ============================================
console.log('📂 1. 寺院マスタ (Temples)...');

const templesInput = JSON.parse(fs.readFileSync(path.join(DATA_IMPORT_DIR, 'temples.json'), 'utf8'));

const firestoreTemples = templesInput.map(t => ({
    // 正式スキーマ: Temple extends FirestoreDocument
    id: t.id,
    name: t.name,
    area: t.area || '',
    sect: t.denomination || '', // denomination → sect
    furigana: t.nameKana || '',
    address: '', // 未取得
    phone: '', // 未取得
    chiefPriest: '', // 住職名（未取得）
    notes: '',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
}));

fs.writeFileSync(
    path.join(OUTPUT_DIR, 'firestore-temples.json'),
    JSON.stringify(firestoreTemples, null, 2)
);
console.log(`   ✅ ${firestoreTemples.length}件 → firestore-temples.json`);

// ============================================
// 2. 担当者マスタ (Staff)
// ============================================
console.log('📂 2. 担当者マスタ (Staff)...');

const staffInput = JSON.parse(fs.readFileSync(path.join(DATA_IMPORT_DIR, 'staff.json'), 'utf8'));

// Staffのスキーマ定義（firestore.tsに追加が必要）
const firestoreStaff = staffInput.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email || '',
    role: s.role || 'sales',
    isActive: s.active !== false,
    branch: '', // 所属拠点（未取得）
    phone: '', // 内線番号等
    notes: '',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
}));

fs.writeFileSync(
    path.join(OUTPUT_DIR, 'firestore-staff.json'),
    JSON.stringify(firestoreStaff, null, 2)
);
console.log(`   ✅ ${firestoreStaff.length}件 → firestore-staff.json`);

// ============================================
// 3. 商品マスタ (Products)
// ============================================
console.log('📂 3. 商品マスタ (Products)...');

const productsInput = JSON.parse(fs.readFileSync(path.join(DATA_IMPORT_DIR, 'products.json'), 'utf8'));

// 寺院名→寺院IDのマッピング作成
const templeNameToId = new Map(templesInput.map(t => [t.name, t.id]));

// Productsのスキーマ定義（firestore.tsに追加が必要）
const firestoreProducts = productsInput.map(p => ({
    id: p.id,
    templeId: templeNameToId.get(p.templeName) || null,
    templeName: p.templeName,
    category: p.category || '',
    planName: p.planName || '',
    stoneType: p.stoneType || '',
    // 価格情報
    platePrice: p.platePrice || null,
    engravingPrice: p.engravingPrice || null,
    boneContainerPrice: p.boneContainerPrice || null,
    boneHandlingFee: p.boneHandlingFee || null,
    bonePickupFee: p.bonePickupFee || null,
    boneProcessingFee: p.boneProcessingFee || null,
    dryingFee: p.dryingFee || null,
    notes: p.notes || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}));

fs.writeFileSync(
    path.join(OUTPUT_DIR, 'firestore-products.json'),
    JSON.stringify(firestoreProducts, null, 2)
);
console.log(`   ✅ ${firestoreProducts.length}件 → firestore-products.json`);

// ============================================
// 4. 商談データ (Deals)
// ============================================
console.log('📂 4. 商談データ (Deals)...');

const dealsInput = JSON.parse(fs.readFileSync(path.join(DATA_IMPORT_DIR, 'deals.json'), 'utf8'));

// ステージのマッピング
function mapStage(stage) {
    switch (stage) {
        case 'WON': return 'PAID';
        case 'LOST': return 'CANCELLED';
        case 'NEGOTIATING': return 'NEGOTIATION';
        case 'VISITED': return 'NEGOTIATION';
        case 'CONTACTED': return 'PROSPECT';
        case 'INQUIRY': return 'PROSPECT';
        default: return 'PROSPECT';
    }
}

// 正式スキーマ: Deal extends FirestoreDocument
const firestoreDeals = dealsInput.map(d => ({
    id: d.id,
    customerId: d.customerId || '', // 顧客ID（必須）
    templeId: d.templeId || '',
    transactionCategoryId: '', // 売上分類ID（未設定）
    title: `${d.customerName} - ${d.planName || '商談'}`,
    amount: d.amount || 0,
    expectedDate: d.inquiryDate || new Date().toISOString().split('T')[0],
    actualDate: d.contractDate || null,
    status: mapStage(d.stage),
    probability: d.stage === 'WON' ? 100 : (d.stage === 'LOST' ? 0 : 50),
    notes: d.notes || '',
    // 移行用追加フィールド
    originalId: d.originalId || '',
    source: d.source || '',
    customerName: d.customerName || '',
    planName: d.planName || '',
    planNo: d.planNo || '',
    assignedTo: d.assignedTo || '',
    assignedToId: d.assignedToId || '',
    visitSource: d.visitSource || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
}));

fs.writeFileSync(
    path.join(OUTPUT_DIR, 'firestore-deals.json'),
    JSON.stringify(firestoreDeals, null, 2)
);
console.log(`   ✅ ${firestoreDeals.length}件 → firestore-deals.json`);

// ============================================
// 5. バッチファイル生成
// ============================================
console.log('\n📦 バッチファイル生成...');

const BATCH_SIZE = 100; // Firestoreの書き込み制限を考慮

function createBatches(data, prefix, batchSize = BATCH_SIZE) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }

    const batchDir = path.join(OUTPUT_DIR, `${prefix}-batches`);
    if (!fs.existsSync(batchDir)) {
        fs.mkdirSync(batchDir, { recursive: true });
    }

    batches.forEach((batch, index) => {
        const fileName = `${prefix}-batch-${String(index).padStart(4, '0')}.json`;
        fs.writeFileSync(path.join(batchDir, fileName), JSON.stringify(batch, null, 2));
    });

    return batches.length;
}

// 商談データのバッチ分割
const dealBatchCount = createBatches(firestoreDeals, 'deals');
console.log(`   商談: ${dealBatchCount}バッチ (各${BATCH_SIZE}件)`);

// ============================================
// 6. サマリー
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📋 再生成結果サマリー');
console.log('='.repeat(60));
console.log(`寺院マスタ:    ${firestoreTemples.length}件`);
console.log(`担当者マスタ:  ${firestoreStaff.length}件`);
console.log(`商品マスタ:    ${firestoreProducts.length}件`);
console.log(`商談データ:    ${firestoreDeals.length}件 (${dealBatchCount}バッチ)`);
console.log(`顧客データ:    firestore-customers.json を使用（既存）`);
console.log('='.repeat(60));

console.log('\n📁 出力ファイル:');
console.log(`   ${OUTPUT_DIR}/`);
console.log('   ├── firestore-temples.json');
console.log('   ├── firestore-staff.json');
console.log('   ├── firestore-products.json');
console.log('   ├── firestore-deals.json');
console.log('   ├── firestore-customers.json (既存)');
console.log('   └── deals-batches/');

console.log('\n⚠️  注意:');
console.log('   1. Staff, Products は firestore.ts にスキーマ追加が必要です');
console.log('   2. 商談の transactionCategoryId は別途設定が必要です');
console.log('   3. 顧客データは既存の firestore-customers.json を使用します');

console.log('\n✨ 完了');
