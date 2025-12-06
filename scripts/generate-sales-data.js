/**
 * 売上CSVデータをTypeScriptモジュールとして出力するスクリプト
 * ビルド前に実行し、frontend/src/data/salesData.ts を生成する
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// パス設定
const CSV_PATH = path.resolve(__dirname, '../data/sales/新：2025売上管理表 - 契約詳細.csv');
const OUTPUT_DIR = path.resolve(__dirname, '../frontend/src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'salesData.ts');

function main() {
    console.log('=== 売上データ生成スクリプト ===');
    console.log(`CSV: ${CSV_PATH}`);
    console.log(`出力先: ${OUTPUT_FILE}`);

    // CSVファイルの存在確認
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`エラー: CSVファイルが見つかりません: ${CSV_PATH}`);
        process.exit(1);
    }

    // 出力ディレクトリの作成
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`ディレクトリ作成: ${OUTPUT_DIR}`);
    }

    // CSVファイルを読み込み（UTF-8として試行、失敗時はShift_JIS）
    let csvContent;
    try {
        const buffer = fs.readFileSync(CSV_PATH);
        // UTF-8としてデコード
        csvContent = buffer.toString('utf-8');
        // BOMを除去
        if (csvContent.charCodeAt(0) === 0xFEFF) {
            csvContent = csvContent.slice(1);
        }
    } catch (err) {
        console.error('CSVファイルの読み込みに失敗しました:', err);
        process.exit(1);
    }

    // 行数をカウント
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log(`読み込み行数: ${lines.length} 行（ヘッダー含む）`);

    // TypeScriptファイルとして出力
    const tsContent = `/**
 * 売上CSVデータ（自動生成）
 * 生成日時: ${new Date().toISOString()}
 * ソース: 新：2025売上管理表 - 契約詳細.csv
 */

const salesCSVData = ${JSON.stringify(csvContent)};

export default salesCSVData;
`;

    fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
    console.log(`✅ 生成完了: ${OUTPUT_FILE}`);
    console.log(`   ファイルサイズ: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
}

main();
