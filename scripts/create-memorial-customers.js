/**
 * 典礼責任者を顧客レコードとして作成するスクリプト
 *
 * 処理内容:
 * 1. 典礼責任者データから新規顧客レコードを作成
 * 2. 元の顧客との関係性レコードを作成
 * 3. Firestoreにインポート
 *
 * 注意事項:
 * - 「本人」「使用者と同じ」などの典礼責任者は除外
 * - 同一人物の重複を避けるため、名前+電話番号で識別
 * - 追客NOは M + 連番 で付与（例: M0001）
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// プロジェクト設定
const PROJECT_ID = 'crm-appsheet-v7';
const DATABASE_ID = 'crm-database-v9';
const CUSTOMERS_COLLECTION = 'Customers';
const RELATIONSHIPS_COLLECTION = 'Relationships';

// サービスアカウントキーのパス
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../crm-appsheet-v7-4cce8f749b52.json');

// 除外する典礼責任者名パターン
const EXCLUDED_NAMES = [
  '使用者と同じ',
  '申込者と同じ',
  '本人',
  '本人(申込者と同一)',
  '本人（申込者）',
  '収骨時記入',
  '',
];

// 除外する続柄パターン（典礼責任者が顧客本人を指す場合）
const EXCLUDED_RELATIONSHIPS = [
  '本人',
  '本人(申込者と同一)',
  '本人（申込者）',
  '申込者と同じ',
  '使用者と同じ',
];

// 続柄から関係性タイプコードへのマッピング
// 典礼責任者の視点: 顧客との関係性を表す
// 例: 「長男」は典礼責任者が顧客の「子」であることを意味
const RELATIONSHIP_MAPPING = {
  // 子（典礼責任者が顧客の子供）
  '長男': { code: 'KAN2001', name: '長男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '次男': { code: 'KAN2002', name: '次男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '二男': { code: 'KAN2002', name: '次男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '三男': { code: 'KAN2003', name: '三男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '四男': { code: 'KAN2004', name: '四男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '長女': { code: 'KAN2011', name: '長女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '次女': { code: 'KAN2012', name: '次女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '二女': { code: 'KAN2012', name: '次女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '三女': { code: 'KAN2013', name: '三女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子': { code: 'KAN2000', name: '子', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '息子': { code: 'KAN2000', name: '息子', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '息子様': { code: 'KAN2000', name: '息子', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '娘': { code: 'KAN2010', name: '娘', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '実子': { code: 'KAN2000', name: '子', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '子ども': { code: 'KAN2000', name: '子', category: '子', reverse: { code: 'KAN2100', name: '親' } },
  '娘(長女)': { code: 'KAN2011', name: '長女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '娘（長女）': { code: 'KAN2011', name: '長女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子（長女）': { code: 'KAN2011', name: '長女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子（長男）': { code: 'KAN2001', name: '長男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '子（次女）': { code: 'KAN2012', name: '次女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子（次男）': { code: 'KAN2002', name: '次男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '子(長女）': { code: 'KAN2011', name: '長女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子(次男)': { code: 'KAN2002', name: '次男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '子(次女)': { code: 'KAN2012', name: '次女', category: '子', reverse: { code: 'KAN2111', name: '母' } },
  '子（三男）': { code: 'KAN2003', name: '三男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  'ご長男': { code: 'KAN2001', name: '長男', category: '子', reverse: { code: 'KAN2101', name: '父' } },
  '息子（二男）': { code: 'KAN2002', name: '次男', category: '子', reverse: { code: 'KAN2101', name: '父' } },

  // 配偶者
  '夫': { code: 'KAN1001', name: '夫', category: '配偶者', reverse: { code: 'KAN1002', name: '妻' } },
  '妻': { code: 'KAN1002', name: '妻', category: '配偶者', reverse: { code: 'KAN1001', name: '夫' } },
  '配偶者': { code: 'KAN1000', name: '配偶者', category: '配偶者', reverse: { code: 'KAN1000', name: '配偶者' } },
  '内妻': { code: 'KAN1012', name: '内妻', category: '配偶者', reverse: { code: 'KAN1011', name: '内夫' } },
  '内縁の妻': { code: 'KAN1012', name: '内妻', category: '配偶者', reverse: { code: 'KAN1011', name: '内夫' } },
  '内縁関係': { code: 'KAN1010', name: '内縁', category: '配偶者', reverse: { code: 'KAN1010', name: '内縁' } },
  'パートナー': { code: 'KAN1020', name: 'パートナー', category: '配偶者', reverse: { code: 'KAN1020', name: 'パートナー' } },
  '妻（未届）': { code: 'KAN1012', name: '内妻', category: '配偶者', reverse: { code: 'KAN1011', name: '内夫' } },
  '奥様': { code: 'KAN1002', name: '妻', category: '配偶者', reverse: { code: 'KAN1001', name: '夫' } },
  '使用者の妻': { code: 'KAN1002', name: '妻', category: '配偶者', reverse: { code: 'KAN1001', name: '夫' } },

  // 親
  '父': { code: 'KAN2101', name: '父', category: '親', reverse: { code: 'KAN2001', name: '子' } },
  '母': { code: 'KAN2111', name: '母', category: '親', reverse: { code: 'KAN2010', name: '子' } },
  '母親': { code: 'KAN2111', name: '母', category: '親', reverse: { code: 'KAN2010', name: '子' } },

  // 兄弟姉妹
  '兄': { code: 'KAN3001', name: '兄', category: '兄弟姉妹', reverse: { code: 'KAN3002', name: '弟' } },
  '弟': { code: 'KAN3002', name: '弟', category: '兄弟姉妹', reverse: { code: 'KAN3001', name: '兄' } },
  '弟様': { code: 'KAN3002', name: '弟', category: '兄弟姉妹', reverse: { code: 'KAN3001', name: '兄' } },
  '姉': { code: 'KAN3011', name: '姉', category: '兄弟姉妹', reverse: { code: 'KAN3012', name: '妹' } },
  '妹': { code: 'KAN3012', name: '妹', category: '兄弟姉妹', reverse: { code: 'KAN3011', name: '姉' } },
  '長兄': { code: 'KAN3001', name: '兄', category: '兄弟姉妹', reverse: { code: 'KAN3002', name: '弟' } },
  '実兄': { code: 'KAN3001', name: '兄', category: '兄弟姉妹', reverse: { code: 'KAN3002', name: '弟' } },
  '実弟': { code: 'KAN3002', name: '弟', category: '兄弟姉妹', reverse: { code: 'KAN3001', name: '兄' } },
  '実姉': { code: 'KAN3011', name: '姉', category: '兄弟姉妹', reverse: { code: 'KAN3012', name: '妹' } },
  '姉妹': { code: 'KAN3010', name: '姉妹', category: '兄弟姉妹', reverse: { code: 'KAN3010', name: '姉妹' } },
  '弟（次男）': { code: 'KAN3002', name: '弟', category: '兄弟姉妹', reverse: { code: 'KAN3001', name: '兄' } },
  '妹(長女)': { code: 'KAN3012', name: '妹', category: '兄弟姉妹', reverse: { code: 'KAN3011', name: '姉' } },

  // 義理の親族
  '義弟': { code: 'KAN3102', name: '義弟', category: '義理の兄弟姉妹', reverse: { code: 'KAN3101', name: '義兄' } },
  '義兄': { code: 'KAN3101', name: '義兄', category: '義理の兄弟姉妹', reverse: { code: 'KAN3102', name: '義弟' } },
  '義姉': { code: 'KAN3111', name: '義姉', category: '義理の兄弟姉妹', reverse: { code: 'KAN3112', name: '義妹' } },
  '義妹': { code: 'KAN3112', name: '義妹', category: '義理の兄弟姉妹', reverse: { code: 'KAN3111', name: '義姉' } },
  '義理弟': { code: 'KAN3102', name: '義弟', category: '義理の兄弟姉妹', reverse: { code: 'KAN3101', name: '義兄' } },
  '義理の弟': { code: 'KAN3102', name: '義弟', category: '義理の兄弟姉妹', reverse: { code: 'KAN3101', name: '義兄' } },
  '義息子': { code: 'KAN2201', name: '義息子', category: '義理の子', reverse: { code: 'KAN2301', name: '義父' } },
  '義娘': { code: 'KAN2211', name: '義娘', category: '義理の子', reverse: { code: 'KAN2311', name: '義母' } },
  '義理息子': { code: 'KAN2201', name: '義息子', category: '義理の子', reverse: { code: 'KAN2301', name: '義父' } },
  '義理娘': { code: 'KAN2211', name: '義娘', category: '義理の子', reverse: { code: 'KAN2311', name: '義母' } },
  '義母': { code: 'KAN2311', name: '義母', category: '義理の親', reverse: { code: 'KAN2211', name: '義娘' } },
  '義理の父': { code: 'KAN2301', name: '義父', category: '義理の親', reverse: { code: 'KAN2201', name: '義息子' } },
  '義長男': { code: 'KAN2201', name: '義息子', category: '義理の子', reverse: { code: 'KAN2301', name: '義父' } },
  '養女': { code: 'KAN2221', name: '養女', category: '養子', reverse: { code: 'KAN2321', name: '養親' } },

  // 甥・姪
  '甥': { code: 'KAN4001', name: '甥', category: '甥姪', reverse: { code: 'KAN4101', name: '叔父' } },
  '姪': { code: 'KAN4011', name: '姪', category: '甥姪', reverse: { code: 'KAN4111', name: '叔母' } },

  // 叔父・叔母
  '叔父': { code: 'KAN4101', name: '叔父', category: '叔父叔母', reverse: { code: 'KAN4001', name: '甥' } },
  '叔母': { code: 'KAN4111', name: '叔母', category: '叔父叔母', reverse: { code: 'KAN4011', name: '姪' } },
  '伯母': { code: 'KAN4111', name: '叔母', category: '叔父叔母', reverse: { code: 'KAN4011', name: '姪' } },
  'おじ': { code: 'KAN4101', name: '叔父', category: '叔父叔母', reverse: { code: 'KAN4001', name: '甥' } },
  '叔父（母の弟）': { code: 'KAN4101', name: '叔父', category: '叔父叔母', reverse: { code: 'KAN4001', name: '甥' } },
  '母の弟の奥様（叔父嫁）': { code: 'KAN4121', name: '叔母（義理）', category: '叔父叔母', reverse: { code: 'KAN4021', name: '甥（義理）' } },
  '母の従兄': { code: 'KAN5001', name: '従兄弟', category: 'いとこ', reverse: { code: 'KAN5001', name: '従兄弟' } },

  // いとこ
  'いとこ': { code: 'KAN5000', name: 'いとこ', category: 'いとこ', reverse: { code: 'KAN5000', name: 'いとこ' } },
  '従兄弟': { code: 'KAN5001', name: '従兄弟', category: 'いとこ', reverse: { code: 'KAN5001', name: '従兄弟' } },
  '従姉妹': { code: 'KAN5002', name: '従姉妹', category: 'いとこ', reverse: { code: 'KAN5002', name: '従姉妹' } },
  '従妹': { code: 'KAN5002', name: '従姉妹', category: 'いとこ', reverse: { code: 'KAN5002', name: '従姉妹' } },
  '従姉': { code: 'KAN5002', name: '従姉妹', category: 'いとこ', reverse: { code: 'KAN5002', name: '従姉妹' } },
  '従姪': { code: 'KAN5011', name: '従姪', category: 'いとこの子', reverse: { code: 'KAN5101', name: '従叔父' } },
  '従姪(従姉の長女)': { code: 'KAN5011', name: '従姪', category: 'いとこの子', reverse: { code: 'KAN5101', name: '従叔父' } },
  '従姉妹の子': { code: 'KAN5011', name: '従姪', category: 'いとこの子', reverse: { code: 'KAN5101', name: '従叔父' } },
  'はとこ': { code: 'KAN5021', name: 'はとこ', category: 'はとこ', reverse: { code: 'KAN5021', name: 'はとこ' } },

  // 孫
  '孫': { code: 'KAN2501', name: '孫', category: '孫', reverse: { code: 'KAN2601', name: '祖父母' } },

  // その他の親族関係
  '妻の妹': { code: 'KAN3122', name: '義妹', category: '義理の兄弟姉妹', reverse: { code: 'KAN3121', name: '義姉' } },
  '妻の姪': { code: 'KAN4021', name: '姪（義理）', category: '甥姪', reverse: { code: 'KAN4121', name: '叔母（義理）' } },
  '兄の子': { code: 'KAN4001', name: '甥姪', category: '甥姪', reverse: { code: 'KAN4101', name: '叔父叔母' } },
  '兄\n甥': { code: 'KAN4001', name: '甥', category: '甥姪', reverse: { code: 'KAN4101', name: '叔父' } },
  'めいの子供': { code: 'KAN4021', name: '姪孫', category: '甥姪の子', reverse: { code: 'KAN4121', name: '大叔父' } },
  '被後見人の従姉妹の娘': { code: 'KAN5011', name: '従姪', category: 'いとこの子', reverse: { code: 'KAN5101', name: '従叔父' } },
  '成年被後見人（長谷川照子様）の孫': { code: 'KAN2501', name: '孫', category: '孫', reverse: { code: 'KAN2601', name: '祖父母' } },

  // 友人・知人
  '友人': { code: 'KAN6001', name: '友人', category: '友人・知人', reverse: { code: 'KAN6001', name: '友人' } },
  '知人': { code: 'KAN6002', name: '知人', category: '友人・知人', reverse: { code: 'KAN6002', name: '知人' } },
  '友人（日本語の通訳）': { code: 'KAN6001', name: '友人', category: '友人・知人', reverse: { code: 'KAN6001', name: '友人' } },

  // 法定代理人・後見人
  '後見人': { code: 'KAN7001', name: '後見人', category: '法定代理人', reverse: { code: 'KAN7101', name: '被後見人' } },
  '成年後見人': { code: 'KAN7001', name: '成年後見人', category: '法定代理人', reverse: { code: 'KAN7101', name: '被後見人' } },
  '後見受任者': { code: 'KAN7001', name: '後見人', category: '法定代理人', reverse: { code: 'KAN7101', name: '被後見人' } },
  '後見受任機関': { code: 'KAN7011', name: '後見受任機関', category: '法定代理人', reverse: { code: 'KAN7111', name: '被後見人' } },
  '任意後見人': { code: 'KAN7002', name: '任意後見人', category: '法定代理人', reverse: { code: 'KAN7102', name: '任意被後見人' } },
  '後見人等候補者': { code: 'KAN7003', name: '後見人候補', category: '法定代理人', reverse: { code: 'KAN7103', name: '被後見人候補' } },
  '後見人？': { code: 'KAN7001', name: '後見人', category: '法定代理人', reverse: { code: 'KAN7101', name: '被後見人' } },
  '実兄の後見人': { code: 'KAN7001', name: '後見人', category: '法定代理人', reverse: { code: 'KAN7101', name: '被後見人' } },
  '死後後見人': { code: 'KAN7021', name: '死後後見人', category: '法定代理人', reverse: { code: 'KAN7121', name: '被後見人' } },
  '保佐人': { code: 'KAN7031', name: '保佐人', category: '法定代理人', reverse: { code: 'KAN7131', name: '被保佐人' } },
  '保佐人（司法書士）': { code: 'KAN7031', name: '保佐人', category: '法定代理人', reverse: { code: 'KAN7131', name: '被保佐人' } },

  // 専門家
  '代理人弁護士': { code: 'KAN8001', name: '弁護士', category: '専門家', reverse: { code: 'KAN8101', name: '依頼人' } },
  '弁護士': { code: 'KAN8001', name: '弁護士', category: '専門家', reverse: { code: 'KAN8101', name: '依頼人' } },
  '弁護士　成年後見人': { code: 'KAN8001', name: '弁護士（後見人）', category: '専門家', reverse: { code: 'KAN8101', name: '被後見人' } },
  '死後事務受任者（弁護士）': { code: 'KAN8001', name: '弁護士', category: '専門家', reverse: { code: 'KAN8101', name: '依頼人' } },
  '司法書士': { code: 'KAN8011', name: '司法書士', category: '専門家', reverse: { code: 'KAN8111', name: '依頼人' } },
  '司法書士　受託者': { code: 'KAN8011', name: '司法書士', category: '専門家', reverse: { code: 'KAN8111', name: '依頼人' } },
  '死後事務委任': { code: 'KAN8021', name: '死後事務受任者', category: '専門家', reverse: { code: 'KAN8121', name: '委任者' } },

  // その他
  '飼い主': { code: 'KAN9001', name: '飼い主', category: 'その他', reverse: { code: 'KAN9101', name: 'ペット' } },
  '会社雇用主': { code: 'KAN9011', name: '雇用主', category: 'ビジネス関係', reverse: { code: 'KAN9111', name: '従業員' } },
  '会社上司': { code: 'KAN9012', name: '上司', category: 'ビジネス関係', reverse: { code: 'KAN9112', name: '部下' } },
  '会社関係・同僚': { code: 'KAN9013', name: '同僚', category: 'ビジネス関係', reverse: { code: 'KAN9013', name: '同僚' } },
  '申込会社責任者': { code: 'KAN9014', name: '会社責任者', category: 'ビジネス関係', reverse: { code: 'KAN9114', name: '顧客' } },
  '入居の老人ホーム': { code: 'KAN9021', name: '介護施設', category: '施設', reverse: { code: 'KAN9121', name: '入居者' } },
  '支援センター長': { code: 'KAN9022', name: '支援センター', category: '施設', reverse: { code: 'KAN9122', name: '利用者' } },
  '葬儀社の方': { code: 'KAN9031', name: '葬儀社', category: 'サービス', reverse: { code: 'KAN9131', name: '顧客' } },
  '保証会社　社員': { code: 'KAN9041', name: '保証会社', category: 'サービス', reverse: { code: 'KAN9141', name: '顧客' } },
};

// 既存のFirestoreから顧客を取得し、名前+電話で一致を確認
async function getExistingCustomers(db) {
  console.log('既存顧客データを取得中...');
  const snapshot = await db.collection(CUSTOMERS_COLLECTION).get();
  const customers = new Map();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // 名前と電話番号で識別キーを作成
    const normalizedName = (data.name || '').replace(/\s+/g, '').trim();
    const phone = data.phone || data.mobile || '';
    const key = `${normalizedName}|${phone}`;
    if (normalizedName) {
      customers.set(key, {
        id: doc.id,
        trackingNo: data.trackingNo,
        name: data.name,
        phone: data.phone,
        mobile: data.mobile,
      });
    }
  }

  console.log(`既存顧客数: ${customers.size}件`);
  return customers;
}

// 住所文字列をパースして構造化
function parseAddress(addressStr) {
  if (!addressStr) return null;

  // 郵便番号を抽出
  const postalMatch = addressStr.match(/〒?(\d{3}[-−ー]?\d{4})/);
  const postalCode = postalMatch ? postalMatch[1].replace(/[-−ー]/g, '-') : '';

  // 郵便番号を除去
  let remaining = addressStr.replace(/〒?\d{3}[-−ー]?\d{4}\s*/, '').trim();

  // 都道府県を抽出
  const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

  let prefecture = '';
  for (const pref of prefectures) {
    if (remaining.startsWith(pref)) {
      prefecture = pref;
      remaining = remaining.slice(pref.length);
      break;
    }
  }

  // 市区町村を抽出（市、区、町、村で終わる部分）
  const cityMatch = remaining.match(/^(.+?[市区町村])/);
  const city = cityMatch ? cityMatch[1] : '';
  if (city) {
    remaining = remaining.slice(city.length);
  }

  return {
    postalCode,
    prefecture,
    city,
    town: remaining.trim(),
    streetNumber: '',
    building: '',
  };
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');

  console.log('=== 典礼責任者の顧客レコード作成 ===');
  console.log(`モード: ${DRY_RUN ? 'DRY-RUN（実際の書き込みなし）' : '本番実行'}`);
  console.log();

  // クリーニング済みデータを読み込む
  const dataPath = path.join(__dirname, '../migration/output/cleaned-customers.json');
  const customers = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`総顧客数: ${customers.length}件`);

  // 典礼責任者を持つ顧客を抽出
  const customersWithMemorial = customers.filter(c => {
    const mc = c.memorialContact;
    if (!mc || !mc.name || !mc.name.trim()) return false;
    const name = mc.name.trim();
    const relationship = (mc.relationship || '').trim();
    // 除外パターンをチェック（名前と続柄の両方）
    if (EXCLUDED_NAMES.includes(name)) return false;
    if (EXCLUDED_RELATIONSHIPS.includes(relationship)) return false;
    return true;
  });

  console.log(`典礼責任者を持つ顧客数（除外後）: ${customersWithMemorial.length}件`);

  // Firebase Admin SDKを初期化
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(SERVICE_ACCOUNT_PATH),
      projectId: PROJECT_ID,
    });
  }
  const db = admin.firestore();
  db.settings({ databaseId: DATABASE_ID });

  // 既存顧客を取得
  const existingCustomers = await getExistingCustomers(db);

  // 典礼責任者を重複排除してリストアップ
  const memorialMap = new Map(); // キー: 名前|電話 → 典礼責任者データ
  const memorialToCustomers = new Map(); // 典礼責任者キー → 元顧客リスト

  for (const customer of customersWithMemorial) {
    const mc = customer.memorialContact;
    const normalizedName = mc.name.replace(/\s+/g, '').trim();
    const phone = mc.phone || mc.mobile || '';
    const key = `${normalizedName}|${phone}`;

    if (!memorialMap.has(key)) {
      memorialMap.set(key, {
        name: mc.name,
        phone: mc.phone,
        mobile: mc.mobile,
        email: mc.email,
        postalCode: mc.postalCode,
        address: mc.address,
        relationships: [],
      });
      memorialToCustomers.set(key, []);
    }

    // 元顧客との関係性を追加
    memorialToCustomers.get(key).push({
      customerId: customer.recordId,
      trackingNo: customer.trackingNo,
      name: customer.name,
      relationship: mc.relationship,
    });
  }

  console.log(`\nユニークな典礼責任者数: ${memorialMap.size}件`);

  // 既存顧客との重複チェック
  let alreadyExists = 0;
  let toCreate = 0;
  const newCustomers = [];
  const relationships = [];

  let memorialNo = 1;
  for (const [key, memorial] of memorialMap) {
    // 既存顧客に存在するかチェック
    if (existingCustomers.has(key)) {
      alreadyExists++;
      const existing = existingCustomers.get(key);
      // 既存顧客への関係性のみ作成
      const originalCustomers = memorialToCustomers.get(key);
      for (const orig of originalCustomers) {
        const rel = orig.relationship || '';
        const mapping = RELATIONSHIP_MAPPING[rel];

        relationships.push({
          sourceCustomerId: orig.customerId,
          sourceCustomerName: orig.name,
          targetCustomerId: existing.id,
          targetCustomerName: memorial.name,
          relationshipType: mapping ? mapping.code : 'KAN9999',
          relationshipName: mapping ? mapping.name : rel || '典礼責任者',
          category: mapping ? mapping.category : 'その他',
          direction: 'forward',
          confidence: 1.0,
          source: {
            type: 'memorialContact',
            originalRelationship: rel,
          },
          needsManualResolution: !mapping,
        });
      }
      continue;
    }

    toCreate++;

    // 新規顧客データを作成
    const trackingNo = `M${String(memorialNo).padStart(4, '0')}`;
    memorialNo++;

    const parsedAddress = parseAddress(memorial.address);
    const now = new Date().toISOString();

    const newCustomer = {
      trackingNo,
      name: memorial.name,
      nameKana: '',
      phone: memorial.phone || '',
      mobile: memorial.mobile || '',
      email: memorial.email || '',
      address: parsedAddress ? JSON.stringify({
        postalCode: memorial.postalCode || parsedAddress.postalCode || '',
        prefecture: parsedAddress.prefecture || '',
        city: parsedAddress.city || '',
        town: parsedAddress.town || '',
        streetNumber: parsedAddress.streetNumber || '',
        building: parsedAddress.building || '',
        fullAddress: memorial.address || '',
      }) : '',
      branch: '',
      parentChildFlag: '',
      notes: '典礼責任者から自動作成',
      createdAt: now,
      updatedAt: now,
      isMemorialContact: true,
    };

    newCustomers.push(newCustomer);

    // 関係性レコードを作成
    const originalCustomers = memorialToCustomers.get(key);
    for (const orig of originalCustomers) {
      const rel = orig.relationship || '';
      const mapping = RELATIONSHIP_MAPPING[rel];

      relationships.push({
        sourceCustomerId: orig.customerId,
        sourceCustomerName: orig.name,
        sourceTrackingNo: orig.trackingNo,
        targetCustomerTrackingNo: trackingNo,
        targetCustomerName: memorial.name,
        relationshipType: mapping ? mapping.code : 'KAN9999',
        relationshipName: mapping ? mapping.name : rel || '典礼責任者',
        category: mapping ? mapping.category : 'その他',
        reverseCode: mapping?.reverse?.code || '',
        reverseName: mapping?.reverse?.name || '',
        direction: 'forward',
        confidence: 1.0,
        source: {
          type: 'memorialContact',
          originalRelationship: rel,
        },
        needsManualResolution: !mapping,
        manualResolutionReason: !mapping ? `未知の続柄: ${rel}` : '',
      });
    }
  }

  console.log(`\n=== 作成予定 ===`);
  console.log(`既存顧客と一致: ${alreadyExists}件`);
  console.log(`新規作成予定: ${toCreate}件`);
  console.log(`関係性レコード: ${relationships.length}件`);

  // 関係性マッピング統計
  const mappedRelationships = relationships.filter(r => !r.needsManualResolution);
  const unmappedRelationships = relationships.filter(r => r.needsManualResolution);
  console.log(`\n関係性マッピング:`);
  console.log(`  マッピング成功: ${mappedRelationships.length}件`);
  console.log(`  要手動解決: ${unmappedRelationships.length}件`);

  if (unmappedRelationships.length > 0) {
    const unmappedReasons = {};
    for (const r of unmappedRelationships) {
      const reason = r.source.originalRelationship || '（空）';
      unmappedReasons[reason] = (unmappedReasons[reason] || 0) + 1;
    }
    console.log(`\n未マッピングの続柄:`);
    const sortedReasons = Object.entries(unmappedReasons).sort((a, b) => b[1] - a[1]);
    for (const [reason, count] of sortedReasons.slice(0, 20)) {
      console.log(`    ${reason}: ${count}件`);
    }
  }

  // 結果を保存
  const outputDir = path.join(__dirname, '../migration/output');

  // 新規顧客リスト
  const newCustomersPath = path.join(outputDir, 'memorial-new-customers.json');
  fs.writeFileSync(newCustomersPath, JSON.stringify(newCustomers, null, 2));
  console.log(`\n新規顧客データを保存: ${newCustomersPath}`);

  // 関係性リスト
  const relationshipsPath = path.join(outputDir, 'memorial-relationships.json');
  fs.writeFileSync(relationshipsPath, JSON.stringify(relationships, null, 2));
  console.log(`関係性データを保存: ${relationshipsPath}`);

  if (DRY_RUN) {
    console.log('\n--- DRY-RUN: データベースへの書き込みはスキップされました ---');
    await admin.app().delete();
    return;
  }

  // Firestoreに書き込み
  console.log('\n=== Firestoreへの書き込み ===');

  // 新規顧客を追加
  console.log('新規顧客を追加中...');
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;
  const trackingNoToId = new Map();

  for (const customer of newCustomers) {
    const docRef = db.collection(CUSTOMERS_COLLECTION).doc();
    trackingNoToId.set(customer.trackingNo, docRef.id);
    batch.set(docRef, customer);
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  追加済み: ${batchCount}件`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  追加済み: ${batchCount}件`);
  }

  console.log(`新規顧客の追加完了: ${newCustomers.length}件`);

  // 関係性レコードを追加
  console.log('\n関係性レコードを追加中...');
  batch = db.batch();
  batchCount = 0;
  let relCreated = 0;

  const now = new Date().toISOString();
  for (const rel of relationships) {
    // 新規顧客のIDを解決
    let targetId = rel.targetCustomerId;
    if (!targetId && rel.targetCustomerTrackingNo) {
      targetId = trackingNoToId.get(rel.targetCustomerTrackingNo);
    }

    if (!targetId) {
      console.warn(`  警告: ターゲットID解決不可 - ${rel.targetCustomerName}`);
      continue;
    }

    const relDoc = {
      sourceCustomerId: rel.sourceCustomerId,
      targetCustomerId: targetId,
      relationshipType: rel.relationshipType,
      relationshipName: rel.relationshipName,
      category: rel.category,
      reverseCode: rel.reverseCode || '',
      reverseName: rel.reverseName || '',
      direction: rel.direction,
      confidence: rel.confidence,
      source: rel.source,
      needsManualResolution: rel.needsManualResolution,
      manualResolutionReason: rel.manualResolutionReason || '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = db.collection(RELATIONSHIPS_COLLECTION).doc();
    batch.set(docRef, relDoc);
    batchCount++;
    relCreated++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  追加済み: ${relCreated}件`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  追加済み: ${batchCount}件`);
  }

  console.log(`関係性レコードの追加完了: ${relCreated}件`);

  console.log('\n=== 処理完了 ===');

  await admin.app().delete();
}

main().catch(console.error);
