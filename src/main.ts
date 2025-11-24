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
 * GET Request Handler
 * Query Params: action, id
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  try {
    const action = e.parameter.action;
    const id = e.parameter.id;

    if (!action) {
      return createResponse(null, false, 'Missing action parameter');
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
      // Add more GET actions here (e.g., search)
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
 * Expects JSON body with: action, id (optional), payload
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

// Expose functions to global scope for GAS to detect them
// (Note: In standard TS-GAS setup, top-level functions are exposed.
//  If using webpack/rollup, explicit export might be needed, but with clasp/tsc it usually works)
declare const global: Record<string, unknown>;
if (typeof global !== 'undefined') {
  global.doGet = doGet;
  global.doPost = doPost;
}