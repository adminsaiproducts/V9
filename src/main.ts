// src/main.ts - DEBUG MODE v2
import { CustomerService } from './services/customer_service';

function doGet(e: GoogleAppsScript.Events.DoGet) {
  try {
    // Check if this is an API request
    const path = e.parameter && e.parameter.path;

    if (path === 'api/customers') {
      return handleApiGetCustomers(e);
    }

    // Parse deep-linking query parameters
    const view = e.parameter && e.parameter.view;
    const id = e.parameter && e.parameter.id;

    // Create initial state object for deep-linking
    const initialState = {
      view: view || null,
      id: id || null,
      timestamp: new Date().toISOString()
    };

    // Otherwise serve the web app with initial state
    var template = HtmlService.createTemplateFromFile('index');
    (template as any).initialState = JSON.stringify(initialState);

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

function doPost(e: GoogleAppsScript.Events.DoPost) {
  try {
    // Placeholder for POST request handling
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'POST request received successfully (placeholder)',
        data: e.postData ? e.postData.contents : 'No data'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error: any) {
    Logger.log('Error in doPost: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.message,
        data: null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function handleApiGetCustomers(e: GoogleAppsScript.Events.DoGet) {
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

function api_getCustomers() {
  try {
    // Fetch ALL customers (no limit)
    // Use listCustomersPaginated with a large page size to get all data
    // Note: page is 0-indexed, so page=0 gets the first batch
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(0, 10000); // Get up to 10,000 customers (page 0)

    return JSON.stringify({
      status: 'success',
      data: result.data.map(c => ({
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

function api_getCustomersPaginated(page: number, pageSize: number, sortField?: string, sortOrder?: string) {
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

/**
 * Get single customer by ID (for deep-linking)
 */
function api_getCustomerById(id: string) {
  try {
    const customerService = new CustomerService();
    const customer = customerService.getCustomer(id);

    if (!customer) {
      return JSON.stringify({
        status: 'error',
        message: `Customer not found: ${id}`,
        data: null
      });
    }

    return JSON.stringify({
      status: 'success',
      data: customer
    });
  } catch (error: any) {
    Logger.log('Error fetching customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: null
    });
  }
}

/**
 * Update customer by ID
 */
function api_updateCustomer(id: string, updates: Record<string, any>) {
  try {
    const customerService = new CustomerService();

    // Transform form data to customer structure
    const customerUpdates: Record<string, any> = {
      name: updates.name,
      nameKana: updates.nameKana,
      gender: updates.gender,
      phone: updates.phone,
      mobile: updates.mobile,
      email: updates.email,
      address: {
        postalCode: updates.postalCode,
        prefecture: updates.prefecture,
        city: updates.city,
        town: updates.town,
        building: updates.building,
      },
    };

    const updatedCustomer = customerService.updateCustomer(id, customerUpdates);

    return JSON.stringify({
      status: 'success',
      data: updatedCustomer
    });
  } catch (error: any) {
    Logger.log('Error updating customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: null
    });
  }
}

/**
 * Debug function to check Firestore connection and properties
 */
function api_debugFirestore() {
  try {
    const props = PropertiesService.getScriptProperties();
    const projectId = props.getProperty('FIRESTORE_PROJECT_ID');
    const databaseId = props.getProperty('FIRESTORE_DATABASE_ID');
    const email = props.getProperty('FIRESTORE_EMAIL');
    const keyExists = !!props.getProperty('FIRESTORE_KEY');

    // Try to fetch one customer
    const customerService = new CustomerService();
    let testResult = 'Not tested';
    let customerCount = 0;
    try {
      const result = customerService.listCustomersPaginated(0, 5);
      customerCount = result.data.length;
      testResult = `Success: Got ${customerCount} customers`;
    } catch (e: any) {
      testResult = `Error: ${e.message}`;
    }

    return JSON.stringify({
      status: 'success',
      debug: {
        projectId: projectId || 'NOT SET',
        databaseId: databaseId || 'NOT SET',
        email: email || 'NOT SET',
        keyExists: keyExists,
        testResult: testResult,
        customerCount: customerCount
      }
    });
  } catch (error: any) {
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

// グローバルスコープに公開（GAS ランタイムが認識できるように）
(globalThis as any).doGet = doGet;
(globalThis as any).doPost = doPost;
(globalThis as any).include = include;
(globalThis as any).api_getCustomers = api_getCustomers;
(globalThis as any).api_getCustomersPaginated = api_getCustomersPaginated;
(globalThis as any).api_getCustomerById = api_getCustomerById;
(globalThis as any).api_updateCustomer = api_updateCustomer;
(globalThis as any).api_debugFirestore = api_debugFirestore;