// src/main.ts - RECOVERY MODE
import { CustomerService } from './services/customer_service';

export function doGet(e: GoogleAppsScript.Events.DoGet) {
  try {
    // Check if this is an API request
    const path = e.parameter && e.parameter.path;

    if (path === 'api/customers') {
      return handleApiGetCustomers(e);
    }

    // Otherwise serve the web app
    var template = HtmlService.createTemplateFromFile('index');
    return template.evaluate()
      .setTitle('CRM V9 - RECOVERY SUCCESS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error: any) {
    Logger.log('Error in doGet: ' + error.message);
    return HtmlService.createHtmlOutput(
      '<h1>Error in doGet</h1><p>' + error.message + '</p><pre>' + error.stack + '</pre>'
    );
  }
}

export function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

export function handleApiGetCustomers(e: GoogleAppsScript.Events.DoGet) {
  try {
    // Parse pagination parameters
    const page = parseInt(e.parameter.page || '0');
    const pageSize = parseInt(e.parameter.pageSize || '100');
    const sortField = e.parameter.sortField;
    const sortOrder = e.parameter.sortOrder as 'asc' | 'desc' | undefined;

    // Use CustomerService to fetch paginated data from Firestore
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(page, pageSize, sortField, sortOrder);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        data: result.data.map(c => ({
          id: c.id,
          name: c.name || '',
          nameKana: c.nameKana || '',
          address: c.address ? `${c.address.prefecture}${c.address.city}${c.address.town}` : '',
          phone: c.phone || c.mobile || '',
          email: c.email || ''
        })),
        total: result.total,
        page: page,
        pageSize: pageSize
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error: any) {
    Logger.log('Error fetching customers: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.message,
        data: [],
        total: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

export function api_getCustomers() {
  try {
    // Legacy method - kept for backward compatibility
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

export function api_getCustomersPaginated(page: number, pageSize: number, sortField?: string, sortOrder?: string) {
  try {
    // Use CustomerService to fetch paginated data from Firestore
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(
      page,
      pageSize,
      sortField,
      sortOrder as 'asc' | 'desc' | undefined
    );

    return JSON.stringify({
      status: 'success',
      data: result.data.map(c => ({
        id: c.id,
        name: c.name || '',
        nameKana: c.nameKana || '',
        address: c.address ? `${c.address.prefecture}${c.address.city}${c.address.town}` : '',
        phone: c.phone || c.mobile || '',
        email: c.email || ''
      })),
      total: result.total,
      page: page,
      pageSize: pageSize
    });
  } catch (error: any) {
    Logger.log('Error fetching customers paginated: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: [],
      total: 0
    });
  }
}