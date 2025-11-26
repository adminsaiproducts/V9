import { CustomerService } from './services/customer_service';
import { DealService } from './services/deal_service';

// Global services initialization
let _customerService: CustomerService | null = null;
let _dealService: DealService | null = null;

function getCustomerService(): CustomerService {
  if (!_customerService) _customerService = new CustomerService();
  return _customerService;
}

function getDealService(): DealService {
  if (!_dealService) _dealService = new DealService();
  return _dealService;
}

/**
 * Standard API Response Helper
 */
function createResponse<T>(data: T, success: boolean = true, message: string = ''): GoogleAppsScript.Content.TextOutput {
  const payload = {
    status: success ? 'success' : 'error',
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper function for GAS template includes
 */
function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * GET Request Handler - Standard GAS Pattern
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput | GoogleAppsScript.HTML.HtmlOutput {
  try {
    const action = e?.parameter?.action;
    const id = e?.parameter?.id;

    // Serve the SPA using template pattern with include()
    if (!action) {
      const template = HtmlService.createTemplateFromFile('index');
      return template.evaluate()
        .setTitle('CRM V9')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const customerService = getCustomerService();
    const dealService = getDealService();

    let result: unknown = null;

    switch (action) {
      case 'getCustomer':
        if (!id) throw new Error('Missing id parameter');
        result = customerService.getCustomer(id);
        break;
      case 'getDeal':
        if (!id) throw new Error('Missing id parameter');
        result = dealService.getDeal(id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return createResponse(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createResponse(null, false, errorMessage);
  }
}

/**
 * POST Request Handler
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    if (!e.postData || !e.postData.contents) {
      return createResponse(null, false, 'Missing POST data');
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload;
    const id = body.id;

    if (!action) {
      return createResponse(null, false, 'Missing action in body');
    }

    const customerService = getCustomerService();
    const dealService = getDealService();

    let result: unknown = null;

    switch (action) {
      case 'createCustomer':
        result = customerService.createCustomer(payload);
        break;
      case 'updateCustomer':
        if (!id) throw new Error('Missing id for update');
        result = customerService.updateCustomer(id, payload);
        break;
      case 'createDeal':
        result = dealService.createDeal(payload);
        break;
      case 'updateDeal':
        if (!id) throw new Error('Missing id for update');
        result = dealService.updateDeal(id, payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return createResponse(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createResponse(null, false, errorMessage);
  }
}

/**
 * API Functions exposed to google.script.run
 */
export function api_getCustomer(id: string): string {
  try {
    const service = getCustomerService();
    const customer = service.getCustomer(id);
    return JSON.stringify({ status: 'success', data: customer });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ status: 'error', message: errorMessage });
  }
}

export function api_searchCustomers(query: string): string {
  try {
    const service = getCustomerService();
    const customers = service.searchCustomers(query);
    return JSON.stringify({ status: 'success', data: customers });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ status: 'error', message: errorMessage });
  }
}

export function api_createCustomer(data: any): string {
  try {
    const service = getCustomerService();
    const customer = service.createCustomer(data);
    return JSON.stringify({ status: 'success', data: customer });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ status: 'error', message: errorMessage });
  }
}

export function api_updateCustomer(id: string, data: any): string {
  try {
    const service = getCustomerService();
    const customer = service.updateCustomer(id, data);
    return JSON.stringify({ status: 'success', data: customer });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ status: 'error', message: errorMessage });
  }
}

export function api_deleteCustomer(id: string): string {
  try {
    const service = getCustomerService();
    service.updateCustomer(id, { deleted: true } as any);
    return JSON.stringify({ status: 'success', data: null });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ status: 'error', message: errorMessage });
  }
}

// Expose functions to global scope for GAS
declare const global: any;
const globalScope = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : ({} as any);
(globalScope as any).doGet = doGet;
(globalScope as any).doPost = doPost;
(globalScope as any).include = include;
(globalScope as any).api_getCustomer = api_getCustomer;
(globalScope as any).api_searchCustomers = api_searchCustomers;
(globalScope as any).api_createCustomer = api_createCustomer;
(globalScope as any).api_updateCustomer = api_updateCustomer;
(globalScope as any).api_deleteCustomer = api_deleteCustomer;