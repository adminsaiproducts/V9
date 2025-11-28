// src/main.ts - RECOVERY MODE
import { CustomerService } from './services/customer_service';

function doGet(_e: GoogleAppsScript.Events.DoGet) {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('CRM V9 - RECOVERY SUCCESS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function api_getCustomers() {
  try {
    // Use CustomerService to fetch real data from Firestore
    const customerService = new CustomerService();
    const customers = customerService.searchCustomers(''); // Get first 50 customers

    return JSON.stringify({
      status: 'success',
      data: customers.map(c => ({
        id: c.id,
        name: c.name || '',
        kana: c.nameKana || '',
        address: c.address ? `${c.address.prefecture}${c.address.city}${c.address.town}` : '',
        phone: c.phone || c.mobile || '',
        email: c.email || ''
      }))
    });
  } catch (error: any) {
    Logger.log('Error fetching customers: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

// グローバルスコープに公開（GAS ランタイムが認識できるように）
(globalThis as any).doGet = doGet;
(globalThis as any).include = include;
(globalThis as any).api_getCustomers = api_getCustomers;