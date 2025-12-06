/**
 * 売上CSVデータを商談データ（Firestore）から自動生成するスクリプト
 *
 * 入力: migration/output/gas-scripts/firestore-deals.json
 *       migration/output/gas-scripts/firestore-temples.json
 * 出力: frontend/src/data/salesData.ts
 *
 * 使用方法: node scripts/generate-sales-from-deals.js
 */

const fs = require('fs');
const path = require('path');

// パス設定
const DEALS_PATH = path.resolve(__dirname, '../migration/output/gas-scripts/firestore-deals.json');
// 商談データのtempleIdは TEMPLE-* 形式なので、data/import/temples.json を使用
const TEMPLES_PATH = path.resolve(__dirname, '../data/import/temples.json');
const OUTPUT_DIR = path.resolve(__dirname, '../frontend/src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'salesData.ts');

/**
 * 日付を YYYY/MM/DD 形式に変換
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

/**
 * 金額を ¥XX,XXX 形式に変換
 */
function formatAmount(amount) {
    if (amount === 0 || amount === null || amount === undefined) return '¥0';
    return '¥' + amount.toLocaleString('ja-JP');
}

/**
 * 日付から売上計上月を算出（YYYY年MM月形式）
 */
function getSalesMonth(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}年${m}月`;
}

/**
 * プラン名から大分類を推定
 */
function getCategoryFromPlan(planName) {
    if (!planName) return '';

    // 大分類マッピング（プラン名に含まれるキーワードで判定）
    const categoryMap = {
        '樹木墓': ['樹木墓', '樹木', 'A/', 'B/', 'C/', 'D/', 'E/'],
        '納骨堂': ['納骨堂', '堂内', '廟'],
        'ペット': ['ペット', 'PR/', 'PET'],
        '墓石': ['墓石', '石碑', '墓誌'],
        '管理料': ['管理料', '年間管理'],
        '法要': ['法要', '読経', '供養'],
        'その他': []
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => planName.includes(kw))) {
            return category;
        }
    }

    return 'その他';
}

function main() {
    console.log('=== 売上データ自動生成スクリプト（商談データから） ===');
    console.log(`商談データ: ${DEALS_PATH}`);
    console.log(`寺院データ: ${TEMPLES_PATH}`);
    console.log(`出力先: ${OUTPUT_FILE}`);

    // 商談データの存在確認
    if (!fs.existsSync(DEALS_PATH)) {
        console.error(`エラー: 商談データが見つかりません: ${DEALS_PATH}`);
        process.exit(1);
    }

    // 寺院データの存在確認
    if (!fs.existsSync(TEMPLES_PATH)) {
        console.error(`エラー: 寺院データが見つかりません: ${TEMPLES_PATH}`);
        process.exit(1);
    }

    // 出力ディレクトリの作成
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`ディレクトリ作成: ${OUTPUT_DIR}`);
    }

    // データ読み込み
    const deals = JSON.parse(fs.readFileSync(DEALS_PATH, 'utf-8'));
    const temples = JSON.parse(fs.readFileSync(TEMPLES_PATH, 'utf-8'));

    console.log(`商談件数: ${deals.length}`);
    console.log(`寺院件数: ${temples.length}`);

    // 寺院マップ作成（templeId → temple）
    const templeMap = new Map();
    temples.forEach(t => templeMap.set(t.id, t));

    // 契約済み（PAID/CONTRACTED）の商談のみ抽出し、日付でソート
    const paidDeals = deals
        .filter(d => d.status === 'PAID' || d.status === 'CONTRACTED')
        .sort((a, b) => {
            const dateA = new Date(a.actualDate || a.expectedDate || '1900-01-01');
            const dateB = new Date(b.actualDate || b.expectedDate || '1900-01-01');
            return dateA - dateB;
        });

    console.log(`契約済み商談件数: ${paidDeals.length}`);

    // CSVヘッダー
    const headers = [
        '入力順', '契約日', '契約者', '寺院名', 'エリア',
        '申込実績', '入金日１', '入金額１', '入金日２', '入金額２',
        '入金日３', '入金額３', '入金合計', '残金',
        '小分類', '大分類', '備考', '工事完了引渡日',
        '修正有無', '売上計上月', '変更履歴'
    ];

    // CSVデータ生成
    const rows = paidDeals.map((deal, index) => {
        const temple = templeMap.get(deal.templeId) || { name: '', area: '' };
        const contractDate = formatDate(deal.actualDate || deal.expectedDate);
        const amount = deal.amount || 0;

        // ステータスがPAIDなら全額入金済みとみなす
        const isPaid = deal.status === 'PAID';
        const paymentDate1 = isPaid ? contractDate : '';
        const paymentAmount1 = isPaid ? formatAmount(amount) : '';
        const totalPayment = isPaid ? formatAmount(amount) : '¥0';
        const balance = isPaid ? '¥0' : formatAmount(amount);

        const smallCategory = deal.planName || '';
        const largeCategory = getCategoryFromPlan(smallCategory);
        const salesMonth = getSalesMonth(deal.actualDate || deal.expectedDate);

        return [
            index + 1,                      // 入力順
            contractDate,                   // 契約日
            deal.customerName || '',        // 契約者
            temple.name || '',              // 寺院名
            temple.area || '',              // エリア
            formatAmount(amount),           // 申込実績
            paymentDate1,                   // 入金日１
            paymentAmount1,                 // 入金額１
            '',                             // 入金日２
            '',                             // 入金額２
            '',                             // 入金日３
            '',                             // 入金額３
            totalPayment,                   // 入金合計
            balance,                        // 残金
            smallCategory,                  // 小分類
            largeCategory,                  // 大分類
            '',                             // 備考（deal.notesは長すぎる場合があるので省略）
            '',                             // 工事完了引渡日
            '',                             // 修正有無
            salesMonth,                     // 売上計上月
            ''                              // 変更履歴
        ];
    });

    // CSV文字列生成
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // セル内にカンマや改行がある場合はダブルクォートで囲む
            const str = String(cell);
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(','))
    ].join('\n');

    // 統計情報
    const totalAmount = paidDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const paidAmount = paidDeals.filter(d => d.status === 'PAID').reduce((sum, d) => sum + (d.amount || 0), 0);

    console.log('\n=== 集計情報 ===');
    console.log(`総申込額: ${formatAmount(totalAmount)}`);
    console.log(`総入金額: ${formatAmount(paidAmount)}`);
    console.log(`入金率: ${((paidAmount / totalAmount) * 100).toFixed(1)}%`);

    // TypeScriptファイルとして出力
    const tsContent = `/**
 * 売上CSVデータ（商談データから自動生成）
 * 生成日時: ${new Date().toISOString()}
 * ソース: firestore-deals.json (${paidDeals.length}件)
 *
 * 集計情報:
 * - 総申込額: ${formatAmount(totalAmount)}
 * - 総入金額: ${formatAmount(paidAmount)}
 * - 入金率: ${((paidAmount / totalAmount) * 100).toFixed(1)}%
 */

const salesCSVData = ${JSON.stringify(csvContent)};

export default salesCSVData;
`;

    fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
    console.log(`\n✅ 生成完了: ${OUTPUT_FILE}`);
    console.log(`   ファイルサイズ: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
    console.log(`   行数: ${rows.length + 1} 行（ヘッダー含む）`);
}

main();
