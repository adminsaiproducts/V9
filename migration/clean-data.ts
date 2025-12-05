/**
 * Data Cleaning Script - CRM V9 Migration
 *
 * GENIEE CRM CSVデータのクリーニング
 * - 電話番号の正規化・検証
 * - メールアドレスの検証
 * - 住所の正規化（重複文字修正、埋め込みデータ抽出）
 * - 無効データの備考欄への移動
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import {
  RawCsvRow,
  CleanedCustomer,
  PhoneCleaningResult,
  EmailCleaningResult,
  AddressCleaningResult,
  CleaningResult,
  MigrationConfig,
} from './types';

// デフォルト設定
const DEFAULT_CONFIG: MigrationConfig = {
  dryRun: false,
  batchSize: 100,
  skipExisting: true,
  cleaningOptions: {
    fixDuplicatePrefectures: true,
    fixInvalidPhoneNumbers: true,
    parseEmbeddedAddresses: true,
    resolveAddressReferences: true,
  },
  relationshipOptions: {
    extractFromNotes: true,
    extractFromParentChildFlag: true,
    extractFromSameAddress: true,
    extractFromSamePhone: true,
    extractFromMemorialContact: true,
    minConfidenceForAutoApprove: 0.7,
  },
};

/**
 * 電話番号をクリーニング
 */
export function cleanPhoneNumber(phone: string): PhoneCleaningResult {
  const original = phone?.trim() || '';
  const issues: string[] = [];
  let cleaned = original;
  let movedToNotes: string | undefined;

  if (!original) {
    return {
      original,
      cleaned: '',
      issues: [],
      isValid: true,
      type: undefined,
    };
  }

  // 余分なテキストを抽出（電話番号に続くメモなど）
  // 注意: 正規表現は電話番号の後に「数字・ハイフン以外」の文字が続く場合のみマッチ
  // 例: "045-123-4567 自宅" → phone: "045-123-4567", notes: "自宅"
  // 修正: 以前の正規表現 /^([\d\-\(\)\s]+)(.+)$/ は最後の桁を切り落としていた
  const phoneWithText = original.match(/^([\d\-\(\)\s]+)([^\d\-\(\)\s].*)$/);
  if (phoneWithText && phoneWithText[2].trim()) {
    cleaned = phoneWithText[1].trim();
    movedToNotes = `電話番号欄から移動: ${phoneWithText[2].trim()}`;
    issues.push(`余分なテキストを備考に移動: "${phoneWithText[2].trim()}"`);
  }

  // 全角を半角に変換
  cleaned = cleaned.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  cleaned = cleaned.replace(/ー/g, '-');

  // ハイフンと数字以外を除去
  const digitsOnly = cleaned.replace(/[^\d]/g, '');

  // 電話番号の種類を判定
  let type: 'landline' | 'mobile' | 'freephone' | 'unknown' = 'unknown';
  let isValid = false;

  if (digitsOnly.length === 10) {
    if (digitsOnly.startsWith('0120') || digitsOnly.startsWith('0800')) {
      type = 'freephone';
      isValid = true;
    } else if (digitsOnly.startsWith('090') || digitsOnly.startsWith('080') || digitsOnly.startsWith('070')) {
      type = 'mobile';
      isValid = true;
    } else if (digitsOnly.startsWith('03') || digitsOnly.startsWith('04') || digitsOnly.startsWith('045') || digitsOnly.startsWith('06')) {
      type = 'landline';
      isValid = true;
    } else if (digitsOnly.startsWith('0')) {
      type = 'landline';
      isValid = true;
    }
  } else if (digitsOnly.length === 11) {
    if (digitsOnly.startsWith('090') || digitsOnly.startsWith('080') || digitsOnly.startsWith('070')) {
      type = 'mobile';
      isValid = true;
    }
  }

  // 無効な電話番号プレフィックス（030-など）をチェック
  if (digitsOnly.startsWith('030') && !digitsOnly.startsWith('0300')) {
    issues.push(`無効な電話番号プレフィックス: ${original}`);
    isValid = false;
    movedToNotes = `無効な電話番号: ${original}`;
    cleaned = '';
  }

  // フォーマットを整える
  if (isValid && cleaned) {
    if (type === 'mobile' && digitsOnly.length === 11) {
      cleaned = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    } else if (type === 'landline' && digitsOnly.length === 10) {
      // 市外局番の長さに応じてフォーマット
      if (digitsOnly.startsWith('03') || digitsOnly.startsWith('06')) {
        cleaned = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
      } else if (digitsOnly.startsWith('045') || digitsOnly.startsWith('044')) {
        cleaned = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      } else {
        cleaned = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6)}`;
      }
    }
  }

  return {
    original,
    cleaned,
    issues,
    movedToNotes,
    isValid,
    type,
  };
}

/**
 * メールアドレスをクリーニング
 */
export function cleanEmail(email: string): EmailCleaningResult {
  const original = email?.trim() || '';
  const issues: string[] = [];
  let cleaned = original;
  let movedToNotes: string | undefined;

  if (!original) {
    return {
      original,
      cleaned: '',
      issues: [],
      isValid: true,
    };
  }

  // 余分なテキストを抽出
  const emailPattern = /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(.*)$/;
  const match = original.match(emailPattern);

  if (match) {
    cleaned = match[1];
    if (match[2].trim()) {
      movedToNotes = `メール欄から移動: ${match[2].trim()}`;
      issues.push(`余分なテキストを備考に移動: "${match[2].trim()}"`);
    }
  }

  // 基本的なバリデーション
  const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned);

  if (!isValid && original) {
    issues.push(`無効なメールアドレス形式: ${original}`);
    movedToNotes = `無効なメールアドレス: ${original}`;
    cleaned = '';
  }

  return {
    original,
    cleaned,
    issues,
    movedToNotes,
    isValid,
  };
}

/**
 * 郵便番号をクリーニング
 * 埋め込まれた住所も抽出する
 */
export function cleanPostalCode(postalCode: string): CleaningResult & { embeddedAddress?: string } {
  const original = postalCode?.trim() || '';
  const issues: string[] = [];
  let cleaned = original;
  let embeddedAddress: string | undefined;
  let movedToNotes: string | undefined;

  if (!original) {
    return { original, cleaned: '', issues: [] };
  }

  // 全角を半角に
  cleaned = cleaned.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  cleaned = cleaned.replace(/ー/g, '-');

  // 〒記号を除去
  cleaned = cleaned.replace(/〒/g, '').trim();

  // 郵便番号の後に住所が埋め込まれているケースを検出
  // 例: "231-0007　横浜市中区弁天通2-21-7F"
  const postalWithAddress = cleaned.match(/^(\d{3}-?\d{4})\s*(.+)$/);
  if (postalWithAddress) {
    cleaned = postalWithAddress[1];
    if (postalWithAddress[2]) {
      embeddedAddress = postalWithAddress[2].trim();
      issues.push(`郵便番号欄に住所が含まれていました: "${embeddedAddress}"`);
    }
  }

  // ハイフンがない場合は追加
  if (/^\d{7}$/.test(cleaned)) {
    cleaned = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  // 形式チェック
  if (cleaned && !/^\d{3}-\d{4}$/.test(cleaned)) {
    issues.push(`無効な郵便番号形式: ${original}`);
    movedToNotes = `無効な郵便番号: ${original}`;
    cleaned = '';
  }

  return {
    original,
    cleaned,
    issues,
    movedToNotes,
    embeddedAddress,
  };
}

/**
 * 都道府県をクリーニング（重複除去）
 */
export function cleanPrefecture(prefecture: string): CleaningResult {
  const original = prefecture?.trim() || '';
  let cleaned = original;
  const issues: string[] = [];

  // 「東京都東京都」のような重複を修正
  const duplicatePattern = /^(東京都|北海道|大阪府|京都府|.+県)\1/;
  if (duplicatePattern.test(cleaned)) {
    const match = cleaned.match(duplicatePattern);
    if (match) {
      cleaned = match[1];
      issues.push(`都道府県の重複を修正: "${original}" → "${cleaned}"`);
    }
  }

  return { original, cleaned, issues };
}

/**
 * 市区町村をクリーニング（重複除去）
 */
export function cleanCity(city: string): CleaningResult {
  const original = city?.trim() || '';
  let cleaned = original;
  const issues: string[] = [];

  // 「横浜市市南区」のような重複を修正
  // パターン: 「〇〇市市」→「〇〇市」
  const duplicateShi = cleaned.replace(/市市/g, '市');
  if (duplicateShi !== cleaned) {
    issues.push(`市の重複を修正: "${original}" → "${duplicateShi}"`);
    cleaned = duplicateShi;
  }

  // 「〇〇区区」→「〇〇区」
  const duplicateKu = cleaned.replace(/区区/g, '区');
  if (duplicateKu !== cleaned) {
    issues.push(`区の重複を修正: "${cleaned}" → "${duplicateKu}"`);
    cleaned = duplicateKu;
  }

  return { original, cleaned, issues };
}

/**
 * 住所全体をクリーニング
 */
export function cleanAddress(
  postalCode: string,
  prefecture: string,
  city: string,
  town: string,
  streetNumber: string,
  building: string
): AddressCleaningResult {
  const issues: string[] = [];

  const postalResult = cleanPostalCode(postalCode);
  const prefectureResult = cleanPrefecture(prefecture);
  const cityResult = cleanCity(city);
  const townResult: CleaningResult = { original: town?.trim() || '', cleaned: town?.trim() || '', issues: [] };
  const streetNumberResult: CleaningResult = { original: streetNumber?.trim() || '', cleaned: streetNumber?.trim() || '', issues: [] };
  const buildingResult: CleaningResult = { original: building?.trim() || '', cleaned: building?.trim() || '', issues: [] };

  // 埋め込まれた住所がある場合、適切なフィールドに分配
  if (postalResult.embeddedAddress) {
    // 都道府県が空の場合、埋め込み住所から抽出を試みる
    if (!prefectureResult.cleaned) {
      const prefMatch = postalResult.embeddedAddress.match(/^(東京都|北海道|大阪府|京都府|.+?県)/);
      if (prefMatch) {
        prefectureResult.cleaned = prefMatch[1];
        prefectureResult.issues.push(`郵便番号欄から都道府県を抽出: "${prefMatch[1]}"`);
      }
    }
  }

  // 全ての問題を集約
  issues.push(...postalResult.issues);
  issues.push(...prefectureResult.issues);
  issues.push(...cityResult.issues);
  issues.push(...townResult.issues);
  issues.push(...streetNumberResult.issues);
  issues.push(...buildingResult.issues);

  // 完全な住所を生成（町村 + 番地 + 建物名）
  const fullAddress = [
    prefectureResult.cleaned,
    cityResult.cleaned,
    townResult.cleaned,
    streetNumberResult.cleaned,
    buildingResult.cleaned,
  ]
    .filter(Boolean)
    .join('');

  return {
    postalCode: postalResult,
    prefecture: prefectureResult,
    city: cityResult,
    town: townResult,
    streetNumber: streetNumberResult,
    building: buildingResult,
    issues,
    fullAddress,
  };
}

/**
 * 「使用者と同じ」などの参照を解決
 */
export function resolveAddressReference(
  address: string,
  customerAddress: AddressCleaningResult
): { resolved: string; isReference: boolean } {
  const trimmed = address?.trim() || '';

  if (trimmed === '使用者と同じ') {
    return {
      resolved: customerAddress.fullAddress,
      isReference: true,
    };
  }

  return { resolved: trimmed, isReference: false };
}

/**
 * CSVの1行をクリーニング
 */
export function cleanRow(row: RawCsvRow): CleanedCustomer {
  const issues: string[] = [];
  const dataMovedToNotes: string[] = [];

  // 連絡先クリーニング
  const phone = cleanPhoneNumber(row.電話番号);
  const mobile = cleanPhoneNumber(row.携帯番号);
  const email = cleanEmail(row['e-mail']);

  issues.push(...phone.issues, ...mobile.issues, ...email.issues);
  if (phone.movedToNotes) dataMovedToNotes.push(phone.movedToNotes);
  if (mobile.movedToNotes) dataMovedToNotes.push(mobile.movedToNotes);
  if (email.movedToNotes) dataMovedToNotes.push(email.movedToNotes);

  // 住所クリーニング
  const address = cleanAddress(
    row.郵便番号,
    row.都道府県,
    row.市区,
    row.町村,
    row.番地,
    row.建物名
  );
  issues.push(...address.issues);

  // 典礼責任者の住所参照を解決
  const memorialAddressResolved = resolveAddressReference(row.典礼責任者住所, address);

  // 典礼責任者の電話番号クリーニング
  const memorialPhone = cleanPhoneNumber(row.典礼責任者電話番号);
  const memorialMobile = cleanPhoneNumber(row.典礼責任者携帯番号);
  const memorialEmail = cleanEmail(row['典礼責任者e-mail']);

  issues.push(...memorialPhone.issues, ...memorialMobile.issues, ...memorialEmail.issues);

  // 備考を構築
  let notes = row.備考 || '';
  if (dataMovedToNotes.length > 0) {
    notes += (notes ? '\n\n' : '') + '【データクリーニングによる移動】\n' + dataMovedToNotes.join('\n');
  }

  return {
    recordId: row.レコードID,
    trackingNo: row.追客NO,
    name: row.使用者名,
    nameKana: row['使用者名（フリガナ）'],
    gender: row.性別,
    age: row.年齢 ? parseInt(row.年齢) : undefined,
    phone,
    mobile,
    email,
    address,
    branch: row.拠点,
    parentChildFlag: row.親子フラグ,
    visitRoute: row.来寺経緯,
    receptionist: row.受付担当,
    doNotContact: row.営業活動不可 === '営業活動不可',
    crossSellTarget: row.クロスセル対象 === 'クロスセル対象',
    memorialContact: {
      name: row.典礼責任者,
      relationship: row.典礼責任者続柄,
      postalCode: cleanPostalCode(row['典礼責任者 郵便番号']).cleaned,
      address: memorialAddressResolved.resolved,
      phone: memorialPhone.cleaned,
      mobile: memorialMobile.cleaned,
      email: memorialEmail.cleaned,
      addressReference: memorialAddressResolved.isReference ? row.典礼責任者住所 : undefined,
    },
    userChangeInfo: {
      hasChanged: !!row.使用者変更,
      reason: row['使用者変更「その他」の理由'],
      previousUserName: row.旧使用者氏名,
      relationshipToNew: row.新使用者との続柄,
    },
    needs: {
      transportation: row['交通手段（車、電車、バス）、最寄り駅、拠点までの所要時間'],
      searchReason: row.お探しの理由,
      familyStructure: row.家族構成,
      religiousSect: row['宗旨・宗派'],
      preferredPlan: row.希望プラン,
      burialPlannedCount: row.埋葬予定人数,
      purchaseTiming: row.お墓の購入時期,
      appealPoints: row.気に入っていただけた点,
      appealPointsOther: row['その「その他」だった内容'],
      concerns: row.お墓について気になること,
      otherConsultation: row.その他のご相談,
    },
    notes,
    originalNotes: row.備考,
    activityCount: parseInt(row.活動履歴件数) || 0,
    dealCount: parseInt(row.商談件数) || 0,
    createdAt: row.作成日時,
    updatedAt: row.更新日時,
    role: row.ロール,
    lastActivityDate: row.最終活動日時,
    lastTransactionDate: row.最終取引日,
    cleaningReport: {
      totalIssues: issues.length,
      issues,
      dataMovedToNotes,
    },
  };
}

/**
 * CSVファイルを読み込んでクリーニング
 */
export async function cleanCsvFile(
  inputPath: string,
  outputPath?: string,
  config: Partial<MigrationConfig> = {}
): Promise<{
  cleanedData: CleanedCustomer[];
  statistics: {
    totalRecords: number;
    recordsWithIssues: number;
    totalIssues: number;
    issueTypes: Record<string, number>;
  };
}> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // CSVを読み込む
  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const rows: RawCsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  console.log(`Reading ${rows.length} records from ${inputPath}`);

  // 各行をクリーニング
  const cleanedData: CleanedCustomer[] = [];
  const issueTypes: Record<string, number> = {};
  let recordsWithIssues = 0;
  let totalIssues = 0;

  for (const row of rows) {
    const cleaned = cleanRow(row);
    cleanedData.push(cleaned);

    if (cleaned.cleaningReport.totalIssues > 0) {
      recordsWithIssues++;
      totalIssues += cleaned.cleaningReport.totalIssues;

      // 問題の種類をカウント
      for (const issue of cleaned.cleaningReport.issues) {
        const type = issue.split(':')[0];
        issueTypes[type] = (issueTypes[type] || 0) + 1;
      }
    }
  }

  // 統計を出力
  const statistics = {
    totalRecords: rows.length,
    recordsWithIssues,
    totalIssues,
    issueTypes,
  };

  console.log('\n=== Cleaning Statistics ===');
  console.log(`Total records: ${statistics.totalRecords}`);
  console.log(`Records with issues: ${statistics.recordsWithIssues}`);
  console.log(`Total issues found: ${statistics.totalIssues}`);
  console.log('\nIssue types:');
  for (const [type, count] of Object.entries(statistics.issueTypes)) {
    console.log(`  ${type}: ${count}`);
  }

  // 出力ファイルに保存（オプション）
  if (outputPath && !mergedConfig.dryRun) {
    fs.writeFileSync(outputPath, JSON.stringify(cleanedData, null, 2), 'utf-8');
    console.log(`\nCleaned data saved to: ${outputPath}`);
  }

  return { cleanedData, statistics };
}

/**
 * メイン実行
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // --dry-run以外の引数をフィルタリング
  const fileArgs = args.filter(arg => !arg.startsWith('--'));
  const inputPath = fileArgs[0] || path.join(__dirname, '../data/genieeCRM/2025_11_24-17_19_09_companies.csv');
  const outputPath = fileArgs[1] || path.join(__dirname, './output/cleaned-customers.json');

  // 出力ディレクトリを作成
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nCRM V9 Data Cleaning Script`);
  console.log(`============================`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  try {
    const result = await cleanCsvFile(inputPath, outputPath, { dryRun });
    console.log('\nCleaning completed successfully!');
    return result;
  } catch (error) {
    console.error('Error during cleaning:', error);
    throw error;
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().catch(console.error);
}

export { main, DEFAULT_CONFIG };
