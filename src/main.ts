// src/main.ts - DEBUG MODE v2
import { CustomerService } from './services/customer_service';
import { FirestoreService } from './services/firestore';

function doGet(e?: GoogleAppsScript.Events.DoGet) {
  try {
    // Handle case when e is undefined (e.g., when called from GAS editor)
    const params = (e && e.parameter) || {};

    // Check if this is an API request
    const path = params.path;

    if (path === 'api/customers' && e) {
      return handleApiGetCustomers(e);
    }

    // Parse deep-linking query parameters
    const view = params.view;
    const id = params.id;

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
    const postData = e.postData ? JSON.parse(e.postData.contents) : {};
    const action = postData.action;

    // Migration API endpoints
    if (action === 'migration_delete') {
      // Delete all customers
      const firestore = new FirestoreService();
      const result = firestore.deleteAllDocuments('customers');
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          action: 'migration_delete',
          deleted: result.deleted,
          errors: result.errors
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'migration_import') {
      // Import customers batch
      const customers = postData.customers || [];
      const batchNumber = postData.batchNumber || 0;
      const customerService = new CustomerService();

      let imported = 0;
      const errors: string[] = [];

      for (const customer of customers) {
        try {
          const now = new Date().toISOString();
          customer.createdAt = customer.createdAt || now;
          customer.updatedAt = customer.updatedAt || now;
          customerService.createCustomer(customer);
          imported++;
        } catch (err: any) {
          errors.push(`${customer.id}: ${err.message}`);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          action: 'migration_import',
          batch: batchNumber,
          imported,
          total: customers.length,
          errors
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'migration_count') {
      // Get customer count
      const customerService = new CustomerService();
      const result = customerService.listCustomersPaginated(0, 1);
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          action: 'migration_count',
          count: result.total
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'POST request received successfully',
        availableActions: ['migration_delete', 'migration_import', 'migration_count']
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

// Cache configuration
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Get cached data or fetch and cache
 */
function getCachedOrFetch(cacheKey: string, fetchFn: () => string): string {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    Logger.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }

  Logger.log(`[Cache MISS] ${cacheKey}`);
  const result = fetchFn();

  // Only cache successful responses
  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'success') {
      // GAS Cache has 100KB limit per key, chunk if needed
      if (result.length < 100000) {
        cache.put(cacheKey, result, CACHE_TTL_SECONDS);
        Logger.log(`[Cache SET] ${cacheKey} (${result.length} bytes)`);
      } else {
        Logger.log(`[Cache SKIP] ${cacheKey} too large (${result.length} bytes)`);
      }
    }
  } catch (e) {
    // Parse error, don't cache
  }

  return result;
}

/**
 * Invalidate customer cache (call after mutations)
 */
function invalidateCustomerCache() {
  const cache = CacheService.getScriptCache();
  // Remove all customer-related cache keys
  cache.remove('customers_all');
  // Note: We can't enumerate cache keys, so paginated cache will expire naturally
  Logger.log('[Cache INVALIDATED] customers');
}

/**
 * Sort customers so that numeric trackingNo (original customers) appear first,
 * followed by M-prefix trackingNo (memorial contact customers)
 */
function sortCustomersByTrackingNo(customers: any[]): any[] {
  return customers.sort((a, b) => {
    const trackingA = a.trackingNo || a.id || '';
    const trackingB = b.trackingNo || b.id || '';

    const isANumeric = /^\d/.test(trackingA);
    const isBNumeric = /^\d/.test(trackingB);

    // Numeric trackingNo first
    if (isANumeric && !isBNumeric) return -1;
    if (!isANumeric && isBNumeric) return 1;

    // Within same category, sort naturally
    return trackingA.localeCompare(trackingB, 'ja', { numeric: true });
  });
}

function api_getCustomers() {
  return getCachedOrFetch('customers_all', () => {
    try {
      // Fetch ALL customers (no limit)
      // Use listCustomersPaginated with a large page size to get all data
      // Note: page is 0-indexed, so page=0 gets the first batch
      const customerService = new CustomerService();
      const result = customerService.listCustomersPaginated(0, 15000); // Get up to 15,000 customers (page 0)

      // Sort customers: numeric trackingNo first, then M-prefix
      const sortedCustomers = sortCustomersByTrackingNo(result.data);

      return JSON.stringify({
        status: 'success',
        data: sortedCustomers.map(c => ({
          id: c.id,
          name: c.name || '',
          kana: c.nameKana || '',
          address: formatAddressForList(c.address),
          phone: extractCleanedValue(c.phone) || extractCleanedValue(c.mobile) || '',
          email: extractCleanedValue(c.email) || ''
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
  });
}

function api_getCustomersPaginated(pageOrOptions: number | { page?: number; pageSize?: number; sortField?: string; sortOrder?: string }, pageSizeArg?: number, sortFieldArg?: string, sortOrderArg?: string) {
  // Handle both object format and individual arguments
  let page: number;
  let pageSize: number;
  let sortField: string | undefined;
  let sortOrder: string | undefined;

  if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
    // Object format: { page, pageSize, sortField, sortOrder }
    page = Number(pageOrOptions.page) || 0;
    pageSize = Number(pageOrOptions.pageSize) || 50;
    sortField = pageOrOptions.sortField;
    sortOrder = pageOrOptions.sortOrder;
  } else {
    // Individual arguments format
    page = Number(pageOrOptions) || 0;
    pageSize = Number(pageSizeArg) || 50;
    sortField = sortFieldArg;
    sortOrder = sortOrderArg;
  }

  // Validate page and pageSize to prevent NaN
  if (isNaN(page) || page < 0) page = 0;
  if (isNaN(pageSize) || pageSize <= 0) pageSize = 50;

  const cacheKey = `customers_p${page}_s${pageSize}_${sortField || ''}_${sortOrder || ''}`;

  return getCachedOrFetch(cacheKey, () => {
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
          address: formatAddressForList(c.address),
          phone: extractCleanedValue(c.phone) || extractCleanedValue(c.mobile) || '',
          email: extractCleanedValue(c.email) || ''
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
  });
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

    // Transform cleaned data structure to flat format for frontend
    const transformedCustomer = transformCustomerForDisplay(customer);

    return JSON.stringify({
      status: 'success',
      data: transformedCustomer
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
 * Update customer by ID (supports all GENIEE CRM fields)
 */
function api_updateCustomer(id: string, updates: Record<string, any>) {
  try {
    const customerService = new CustomerService();

    // Transform form data to customer structure (full GENIEE CRM fields)
    const customerUpdates: Record<string, any> = {
      // 識別情報
      trackingNo: updates.trackingNo,
      parentChildFlag: updates.parentChildFlag,
      branch: updates.branch,

      // 基本情報
      name: updates.name,
      nameKana: updates.nameKana,
      gender: updates.gender,
      age: updates.age ? parseInt(updates.age) : undefined,

      // 連絡先
      phone: updates.phone,
      mobile: updates.mobile,
      email: updates.email,

      // 住所
      address: {
        postalCode: updates.postalCode,
        prefecture: updates.prefecture,
        city: updates.city,
        town: updates.town,
        streetNumber: updates.streetNumber,
        building: updates.building,
      },

      // CRM管理情報
      notes: updates.notes,
      visitRoute: updates.visitRoute,
      otherCompanyReferralDate: updates.otherCompanyReferralDate,
      receptionist: updates.receptionist,
      doNotContact: updates.doNotContact === true || updates.doNotContact === 'true',
      crossSellTarget: updates.crossSellTarget === true || updates.crossSellTarget === 'true',

      // 典礼責任者
      memorialContact: {
        name: updates.memorialContactName,
        relationship: updates.memorialContactRelationship,
        postalCode: updates.memorialContactPostalCode,
        address: updates.memorialContactAddress,
        phone: updates.memorialContactPhone,
        mobile: updates.memorialContactMobile,
        email: updates.memorialContactEmail,
      },

      // 使用者変更
      userChangeInfo: {
        hasChanged: updates.userHasChanged === true || updates.userHasChanged === 'true',
        reason: updates.userChangeReason,
        previousUserName: updates.previousUserName,
        relationshipToNew: updates.relationshipToNewUser,
      },

      // ニーズ・嗜好
      needs: {
        transportation: updates.transportation,
        searchReason: updates.searchReason,
        familyStructure: updates.familyStructure,
        religiousSect: updates.religiousSect,
        preferredPlan: updates.preferredPlan,
        burialPlannedCount: updates.burialPlannedCount,
        purchaseTiming: updates.purchaseTiming,
        appealPoints: updates.appealPoints,
        appealPointsOther: updates.appealPointsOther,
        concerns: updates.concerns,
        otherConsultation: updates.otherConsultation,
      },
    };

    // Remove undefined values to prevent overwriting with undefined
    const cleanUpdates = removeUndefined(customerUpdates);

    const updatedCustomer = customerService.updateCustomer(id, cleanUpdates);

    // Invalidate cache after mutation
    invalidateCustomerCache();

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
 * Recursively remove undefined values from object
 */
function removeUndefined(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const cleaned = removeUndefined(value);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract cleaned value from migration data structure
 * Migration data has format: { original, cleaned, issues, ... }
 * This extracts the 'cleaned' value or returns the original if it's a string
 */
function extractCleanedValue(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.cleaned !== undefined) {
    return field.cleaned || '';
  }
  return '';
}

/**
 * Format address for list display
 * Handles both cleaned data structure and flat structure
 */
function formatAddressForList(address: any): string {
  if (!address) return '';

  // If address is a JSON string, parse it first
  let addressObj = address;
  if (typeof address === 'string') {
    // Try to parse as JSON
    if (address.startsWith('{')) {
      try {
        addressObj = JSON.parse(address);
      } catch (e) {
        // Not JSON, return as-is
        return address;
      }
    } else {
      return address;
    }
  }

  // Check for fullAddress field (from cleaned data)
  if (addressObj.fullAddress) return addressObj.fullAddress;

  // Build from components - handle nested cleaned structure
  const parts: string[] = [];

  // Handle cleaned data structure (prefecture: { cleaned: '...' })
  const getPart = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field.cleaned !== undefined) return field.cleaned || '';
    return '';
  };

  const prefecture = getPart(addressObj.prefecture);
  const city = getPart(addressObj.city);
  const town = getPart(addressObj.town);
  const streetNumber = getPart(addressObj.streetNumber);
  const building = getPart(addressObj.building);

  if (prefecture) parts.push(prefecture);
  if (city) parts.push(city);
  if (town) parts.push(town);
  if (streetNumber) parts.push(streetNumber);
  if (building) parts.push(building);

  return parts.join('');
}

/**
 * Transform customer data from cleaned migration format to display format
 * This handles the nested structure from data cleaning
 */
function transformCustomerForDisplay(customer: any): any {
  if (!customer) return null;

  // Extract phone/mobile/email from cleaned structure
  const phone = extractCleanedValue(customer.phone);
  const mobile = extractCleanedValue(customer.mobile);
  const email = extractCleanedValue(customer.email);

  // Transform address
  let address = null;
  if (customer.address) {
    // If address is a JSON string, parse it first
    let addr = customer.address;
    if (typeof addr === 'string' && addr.startsWith('{')) {
      try {
        addr = JSON.parse(addr);
      } catch (e) {
        // Not valid JSON, keep as-is
      }
    }

    // Now extract values
    if (typeof addr === 'object') {
      address = {
        postalCode: extractCleanedValue(addr.postalCode),
        prefecture: extractCleanedValue(addr.prefecture),
        city: extractCleanedValue(addr.city),
        town: extractCleanedValue(addr.town),
        streetNumber: extractCleanedValue(addr.streetNumber),
        building: extractCleanedValue(addr.building),
      };
    }
  }

  return {
    id: customer.id,
    recordId: customer.recordId,
    trackingNo: customer.trackingNo,
    parentChildFlag: customer.parentChildFlag,
    branch: customer.branch,
    name: customer.name,
    nameKana: customer.nameKana,
    kana: customer.nameKana, // alias for compatibility
    gender: customer.gender,
    age: customer.age,
    phone: phone,
    mobile: mobile,
    email: email,
    address: address,
    visitRoute: customer.visitRoute,
    receptionist: customer.receptionist,
    otherCompanyReferralDate: customer.otherCompanyReferralDate,
    doNotContact: customer.doNotContact,
    crossSellTarget: customer.crossSellTarget,
    notes: customer.notes,
    memorialContact: customer.memorialContact,
    userChangeInfo: customer.userChangeInfo,
    needs: customer.needs,
    activityCount: customer.activityCount,
    dealCount: customer.dealCount,
    lastActivityDate: customer.lastActivityDate,
    lastTransactionDate: customer.lastTransactionDate,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    originalId: customer.recordId,
    role: customer.role,
    type: customer.type,
  };
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

/**
 * Delete all customers from Firestore (OPTIMIZED with batch delete)
 * WARNING: This will permanently delete all customer data
 *
 * Uses batchWrite with delete operations - 500 deletes per API call
 * 10,852 records = ~44 API calls (22 for list + 22 for delete)
 * vs old method: 10,852+ API calls
 */
function migration_deleteAllCustomers() {
  try {
    Logger.log(`=== BATCH DELETE (Optimized) ===`);
    Logger.log(`Using batchWrite API: 500 deletes per API call`);

    const firestore = new FirestoreService();
    const result = firestore.deleteAllDocuments('Customers');

    Logger.log(`=== BATCH DELETE COMPLETE ===`);
    Logger.log(`Deleted: ${result.deleted} customers`);
    Logger.log(`Total API calls: ${result.apiCalls}`);

    if (result.errors.length > 0) {
      Logger.log(`Errors: ${result.errors.length}`);
      result.errors.forEach((e: string) => Logger.log(e));
    }

    return JSON.stringify({
      status: 'success',
      deleted: result.deleted,
      apiCalls: result.apiCalls,
      errors: result.errors
    });
  } catch (error: any) {
    Logger.log('Error deleting customers: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Import customers from JSON data
 * Call with: migration_importCustomers(jsonString)
 */
function migration_importCustomers(jsonData: string) {
  try {
    const customers = JSON.parse(jsonData);
    const customerService = new CustomerService();

    let imported = 0;
    let errors: string[] = [];

    for (const customer of customers) {
      try {
        // Set timestamps
        const now = new Date().toISOString();
        customer.createdAt = customer.createdAt || now;
        customer.updatedAt = customer.updatedAt || now;

        customerService.createCustomer(customer);
        imported++;

        // Progress log every 100 records
        if (imported % 100 === 0) {
          Logger.log(`Progress: ${imported}/${customers.length}`);
        }
      } catch (e: any) {
        errors.push(`${customer.id}: ${e.message}`);
      }
    }

    Logger.log(`Import complete: ${imported} customers imported`);
    if (errors.length > 0) {
      Logger.log(`Errors: ${errors.length}`);
    }

    return JSON.stringify({
      status: 'success',
      imported,
      total: customers.length,
      errors
    });
  } catch (error: any) {
    Logger.log('Error importing customers: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Import a batch of customers (for large datasets)
 * Call multiple times with different batches
 */
function migration_importCustomersBatch(jsonData: string, batchNumber: number) {
  try {
    const customers = JSON.parse(jsonData);
    const customerService = new CustomerService();

    let imported = 0;
    let errors: string[] = [];

    Logger.log(`Starting batch ${batchNumber} with ${customers.length} customers`);

    for (const customer of customers) {
      try {
        const now = new Date().toISOString();
        customer.createdAt = customer.createdAt || now;
        customer.updatedAt = customer.updatedAt || now;

        customerService.createCustomer(customer);
        imported++;
      } catch (e: any) {
        errors.push(`${customer.id}: ${e.message}`);
      }
    }

    Logger.log(`Batch ${batchNumber} complete: ${imported}/${customers.length}`);

    return JSON.stringify({
      status: 'success',
      batch: batchNumber,
      imported,
      total: customers.length,
      errors
    });
  } catch (error: any) {
    return JSON.stringify({
      status: 'error',
      batch: batchNumber,
      message: error.message
    });
  }
}

/**
 * Get current customer count
 */
function migration_getCustomerCount() {
  try {
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(0, 1);

    return JSON.stringify({
      status: 'success',
      count: result.total
    });
  } catch (error: any) {
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Import customers from Google Drive JSON file
 * @param fileId - Google Drive file ID of the JSON file
 * @param startIndex - Start index for batch import (default 0)
 * @param batchSize - Number of records per batch (default 100)
 */
function migration_importFromDrive(fileId: string, startIndex: number = 0, batchSize: number = 100) {
  try {
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const allCustomers = JSON.parse(content);

    const totalRecords = allCustomers.length;
    const endIndex = Math.min(startIndex + batchSize, totalRecords);
    const batch = allCustomers.slice(startIndex, endIndex);

    Logger.log(`Processing batch: ${startIndex} to ${endIndex} of ${totalRecords}`);

    const customerService = new CustomerService();
    let imported = 0;
    const errors: string[] = [];

    for (const customer of batch) {
      try {
        const now = new Date().toISOString();
        customer.createdAt = customer.createdAt || now;
        customer.updatedAt = customer.updatedAt || now;
        customerService.createCustomer(customer);
        imported++;
      } catch (err: any) {
        errors.push(`${customer.id}: ${err.message}`);
      }
    }

    const hasMore = endIndex < totalRecords;
    Logger.log(`Imported ${imported}/${batch.length} customers`);

    return JSON.stringify({
      status: 'success',
      imported,
      errors: errors.length,
      startIndex,
      endIndex,
      totalRecords,
      hasMore,
      nextStartIndex: hasMore ? endIndex : null
    });
  } catch (error: any) {
    Logger.log('Error: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * Run full import from Google Drive (auto batching)
 * @param fileId - Google Drive file ID of the JSON file
 */
function migration_runFullImport(fileId: string) {
  try {
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const allCustomers = JSON.parse(content);

    const totalRecords = allCustomers.length;
    const batchSize = 50;

    Logger.log(`Starting full import of ${totalRecords} customers`);

    const customerService = new CustomerService();
    let totalImported = 0;
    let totalErrors = 0;

    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch = allCustomers.slice(i, i + batchSize);

      for (const customer of batch) {
        try {
          const now = new Date().toISOString();
          customer.createdAt = customer.createdAt || now;
          customer.updatedAt = customer.updatedAt || now;
          customerService.createCustomer(customer);
          totalImported++;
        } catch (err: any) {
          totalErrors++;
          Logger.log(`Error: ${customer.id}: ${err.message}`);
        }
      }

      Logger.log(`Progress: ${Math.min(i + batchSize, totalRecords)}/${totalRecords}`);
      Utilities.sleep(500);
    }

    Logger.log(`Import complete: ${totalImported} imported, ${totalErrors} errors`);
    return JSON.stringify({ status: 'success', totalImported, totalErrors, totalRecords });
  } catch (error: any) {
    Logger.log('Error: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * Resume import - skip existing records and continue
 * Uses ScriptProperties to track progress
 * @param fileId - Google Drive file ID of the JSON file
 */
function migration_resumeImport(fileId: string) {
  try {
    const props = PropertiesService.getScriptProperties();
    const progressKey = 'MIGRATION_PROGRESS';

    // Get current progress
    let startIndex = parseInt(props.getProperty(progressKey) || '0');

    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const allCustomers = JSON.parse(content);
    const totalRecords = allCustomers.length;

    Logger.log(`Resuming import from index ${startIndex} of ${totalRecords}`);

    if (startIndex >= totalRecords) {
      return JSON.stringify({
        status: 'complete',
        message: 'All records already imported',
        totalRecords
      });
    }

    const customerService = new CustomerService();
    const batchSize = 100;
    const maxPerRun = 500; // Limit per execution to avoid timeout
    let imported = 0;
    let errors = 0;
    let current = startIndex;

    const endIndex = Math.min(startIndex + maxPerRun, totalRecords);

    for (let i = startIndex; i < endIndex; i += batchSize) {
      const batch = allCustomers.slice(i, Math.min(i + batchSize, endIndex));

      for (const customer of batch) {
        try {
          const now = new Date().toISOString();
          customer.createdAt = customer.createdAt || now;
          customer.updatedAt = customer.updatedAt || now;
          customerService.createCustomer(customer);
          imported++;
        } catch (err: any) {
          errors++;
        }
        current++;
      }

      // Save progress after each batch
      props.setProperty(progressKey, current.toString());
      Logger.log(`Progress: ${current}/${totalRecords}`);
    }

    const hasMore = current < totalRecords;

    return JSON.stringify({
      status: hasMore ? 'partial' : 'complete',
      imported,
      errors,
      currentIndex: current,
      totalRecords,
      hasMore,
      message: hasMore ? `Run again to continue (${totalRecords - current} remaining)` : 'Import complete!'
    });
  } catch (error: any) {
    Logger.log('Error: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * Reset import progress counter
 */
function migration_resetProgress() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('MIGRATION_PROGRESS');
  return JSON.stringify({ status: 'success', message: 'Progress reset to 0' });
}

/**
 * Get current import progress
 */
function migration_getProgress() {
  const props = PropertiesService.getScriptProperties();
  const progress = props.getProperty('MIGRATION_PROGRESS') || '0';
  return JSON.stringify({ status: 'success', currentIndex: parseInt(progress) });
}

/**
 * Wrapper for runFullImport with hardcoded fileId
 * File: cleaned-customers.json on Google Drive
 */
function runFullImport() {
  const fileId = '1qgVhqjz-i7dBRMikF5FiaS2i4_jY8WP_';
  return migration_runFullImport(fileId);
}

/**
 * Wrapper for resumeImport with hardcoded fileId
 * Run this multiple times to complete the import
 */
function resumeImport() {
  const fileId = '1qgVhqjz-i7dBRMikF5FiaS2i4_jY8WP_';
  return migration_resumeImport(fileId);
}

/**
 * OPTIMIZED: Batch import using batchWrite API
 * Uses Firestore batchWrite to import up to 500 documents per API call
 * This reduces API calls from 10,000+ to ~22 calls
 *
 * IMPORTANT: This function:
 * - Uses batchWrite (1 API call per 500 records)
 * - Skips audit logs during migration (saves 50% of API calls)
 * - Reuses FirestoreService instance (saves token refresh calls)
 * - Does NOT delete existing data - use migration_deleteAllCustomers first if needed
 *
 * API Call Calculation:
 * - 10,852 records ÷ 500 per batch = 22 API calls (vs 21,704 with old method)
 * - 1 token refresh per execution = 1 API call
 * - Total: ~23 API calls per execution (vs 100,000+ with old method)
 *
 * @param fileId - Google Drive file ID of the JSON file
 */
function migration_batchImport(fileId: string) {
  try {
    const props = PropertiesService.getScriptProperties();
    const progressKey = 'MIGRATION_BATCH_PROGRESS';

    // Get current progress
    let startIndex = parseInt(props.getProperty(progressKey) || '0');

    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const rawCustomers = JSON.parse(content);

    // IMPORTANT: Data has 'recordId' field, not 'id'
    // Map recordId to id and remove duplicates
    const customerMap = new Map();
    for (const customer of rawCustomers) {
      // Use recordId as the document ID (cleaned data uses recordId, not id)
      const docId = customer.recordId || customer.id;
      if (docId) {
        customer.id = docId; // Ensure id field exists for Firestore
        customerMap.set(docId, customer);
      }
    }
    const allCustomers = Array.from(customerMap.values());
    const totalRecords = allCustomers.length;
    const skippedOrDuplicates = rawCustomers.length - totalRecords;

    Logger.log(`=== BATCH IMPORT (Optimized) ===`);
    Logger.log(`Raw records: ${rawCustomers.length}, Valid unique: ${totalRecords}, Skipped/Duplicates: ${skippedOrDuplicates}`);
    Logger.log(`Starting from index ${startIndex} of ${totalRecords}`);
    Logger.log(`Using batchWrite API: 500 records per API call`);

    if (startIndex >= totalRecords) {
      return JSON.stringify({
        status: 'complete',
        message: 'All records already imported',
        totalRecords
      });
    }

    // Single FirestoreService instance (reuses token)
    const firestore = new FirestoreService();
    const BATCH_SIZE = 500; // Firestore batchWrite limit is 500
    const MAX_BATCHES_PER_RUN = 25; // Process all unique records in one execution

    let imported = 0;
    let errors = 0;
    let batchCount = 0;
    let current = startIndex;
    let apiCalls = 0;

    while (current < totalRecords && batchCount < MAX_BATCHES_PER_RUN) {
      const endIndex = Math.min(current + BATCH_SIZE, totalRecords);
      const batch = allCustomers.slice(current, endIndex);

      // Prepare batch writes (NO audit logs - saves 50% of API calls)
      const writes = batch.map((customer: any) => {
        const now = new Date().toISOString();
        customer.createdAt = customer.createdAt || now;
        customer.updatedAt = customer.updatedAt || now;
        return {
          collection: 'Customers',
          id: customer.id,
          data: customer
        };
      });

      try {
        firestore.batchWrite(writes);
        apiCalls++;
        imported += writes.length;
        Logger.log(`Batch ${batchCount + 1}: ${writes.length} records (API call #${apiCalls}, total: ${imported})`);
      } catch (err: any) {
        Logger.log(`Batch error at ${current}: ${err.message}`);
        errors += writes.length;
      }

      current = endIndex;
      batchCount++;

      // Save progress after each batch
      props.setProperty(progressKey, current.toString());
    }

    const hasMore = current < totalRecords;

    Logger.log(`=== BATCH IMPORT COMPLETE ===`);
    Logger.log(`Imported: ${imported}, Errors: ${errors}`);
    Logger.log(`Total API calls: ${apiCalls}`);

    return JSON.stringify({
      status: hasMore ? 'partial' : 'complete',
      imported,
      errors,
      currentIndex: current,
      totalRecords,
      hasMore,
      batchesProcessed: batchCount,
      apiCalls: apiCalls,
      skippedOrDuplicates: skippedOrDuplicates,
      message: hasMore ? `Run again to continue (${totalRecords - current} remaining)` : 'Import complete!'
    });
  } catch (error: any) {
    Logger.log('Error: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * Reset batch import progress counter
 */
function migration_resetBatchProgress() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('MIGRATION_BATCH_PROGRESS');
  return JSON.stringify({ status: 'success', message: 'Batch progress reset to 0' });
}

/**
 * Get current batch import progress
 */
function migration_getBatchProgress() {
  const props = PropertiesService.getScriptProperties();
  const progress = props.getProperty('MIGRATION_BATCH_PROGRESS') || '0';
  return JSON.stringify({ status: 'success', currentIndex: parseInt(progress) });
}

/**
 * Wrapper for batch import with hardcoded fileId
 * RECOMMENDED: Use this for efficient import (500 records per API call)
 */
function batchImport() {
  const fileId = '1qgVhqjz-i7dBRMikF5FiaS2i4_jY8WP_';
  return migration_batchImport(fileId);
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
(globalThis as any).migration_deleteAllCustomers = migration_deleteAllCustomers;
(globalThis as any).migration_importCustomers = migration_importCustomers;
(globalThis as any).migration_importCustomersBatch = migration_importCustomersBatch;
(globalThis as any).migration_getCustomerCount = migration_getCustomerCount;
(globalThis as any).migration_importFromDrive = migration_importFromDrive;
(globalThis as any).migration_runFullImport = migration_runFullImport;
(globalThis as any).migration_resumeImport = migration_resumeImport;
(globalThis as any).migration_resetProgress = migration_resetProgress;
(globalThis as any).migration_getProgress = migration_getProgress;
(globalThis as any).runFullImport = runFullImport;
(globalThis as any).resumeImport = resumeImport;
(globalThis as any).migration_batchImport = migration_batchImport;
(globalThis as any).migration_resetBatchProgress = migration_resetBatchProgress;
(globalThis as any).migration_getBatchProgress = migration_getBatchProgress;
(globalThis as any).batchImport = batchImport;

// ============================================================
// Relationship API functions
// ============================================================

/**
 * Get relationships for a customer
 * Returns relationships where the customer is either source or target
 */
function api_getCustomerRelationships(customerId: string) {
  try {
    const firestore = new FirestoreService();
    const customerService = new CustomerService();

    // Get relationships where customer is source
    const sourceRelationships = firestore.queryDocuments('Relationships', {
      where: [{ field: 'sourceCustomerId', op: '==', value: customerId }]
    });

    // Get relationships where customer is target
    const targetRelationships = firestore.queryDocuments('Relationships', {
      where: [{ field: 'targetCustomerId', op: '==', value: customerId }]
    });

    const allRelationships = [...sourceRelationships, ...targetRelationships];

    // Fetch related customer info for each relationship
    interface RelationshipDoc {
      sourceCustomerId: string;
      targetCustomerId: string;
      [key: string]: unknown;
    }
    interface RelatedCustomerInfo {
      id: string;
      name: string;
      nameKana?: string;
      phone?: string;
      email?: string;
    }

    const result = (allRelationships as RelationshipDoc[]).map((rel) => {
      const isSource = rel.sourceCustomerId === customerId;
      const relatedCustomerId = isSource ? rel.targetCustomerId : rel.sourceCustomerId;

      let relatedCustomer: RelatedCustomerInfo = { id: relatedCustomerId, name: 'Unknown' };
      try {
        const customer = customerService.getCustomer(relatedCustomerId);
        if (customer) {
          relatedCustomer = {
            id: customer.id,
            name: customer.name || 'Unknown',
            nameKana: customer.nameKana,
            phone: extractCleanedValue(customer.phone) || extractCleanedValue(customer.mobile),
            email: extractCleanedValue(customer.email)
          };
        }
      } catch (e) {
        // Customer not found, use default
      }

      return {
        relationship: rel,
        customer: relatedCustomer
      };
    });

    return JSON.stringify({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    Logger.log('Error fetching relationships: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

/**
 * Get all unresolved relationships (needsManualResolution = true)
 */
function api_getUnresolvedRelationships() {
  try {
    const firestore = new FirestoreService();

    const relationships = firestore.queryDocuments('Relationships', {
      where: [{ field: 'needsManualResolution', op: '==', value: true }]
    });

    return JSON.stringify({
      status: 'success',
      data: relationships
    });
  } catch (error: any) {
    Logger.log('Error fetching unresolved relationships: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

/**
 * Create a new relationship
 */
function api_createRelationship(data: Record<string, any>) {
  try {
    const firestore = new FirestoreService();
    const now = new Date().toISOString();

    const relationshipId = `${data.sourceCustomerId}-${data.targetCustomerId}-manual-${Date.now()}`;

    const relationship = {
      id: relationshipId,
      sourceCustomerId: data.sourceCustomerId,
      targetCustomerId: data.targetCustomerId,
      relationshipType: data.relationshipType,
      relationshipName: data.relationshipName || data.relationshipType,
      direction: data.direction || 'forward',
      confidence: 1.0,
      source: { type: 'manual' },
      description: data.description,
      needsManualResolution: false,
      createdAt: now,
      updatedAt: now
    };

    firestore.createDocument('Relationships', relationshipId, relationship);

    return JSON.stringify({
      status: 'success',
      data: relationship
    });
  } catch (error: any) {
    Logger.log('Error creating relationship: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Update a relationship
 */
function api_updateRelationship(id: string, updates: Record<string, any>) {
  try {
    const firestore = new FirestoreService();

    updates.updatedAt = new Date().toISOString();

    const updated = firestore.updateDocument('Relationships', id, updates);

    return JSON.stringify({
      status: 'success',
      data: updated
    });
  } catch (error: any) {
    Logger.log('Error updating relationship: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Delete a relationship
 */
function api_deleteRelationship(id: string) {
  try {
    const firestore = new FirestoreService();

    firestore.deleteDocument('Relationships', id);

    return JSON.stringify({
      status: 'success',
      message: 'Relationship deleted'
    });
  } catch (error: any) {
    Logger.log('Error deleting relationship: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Resolve a relationship (confirm or reject)
 */
function api_resolveRelationship(id: string, confirmed: boolean, resolvedBy?: string) {
  try {
    const firestore = new FirestoreService();
    const now = new Date().toISOString();

    if (confirmed) {
      const updates = {
        needsManualResolution: false,
        resolvedAt: now,
        resolvedBy: resolvedBy || 'user',
        confidence: 1.0,
        updatedAt: now
      };

      const updated = firestore.updateDocument('Relationships', id, updates);

      return JSON.stringify({
        status: 'success',
        data: updated
      });
    } else {
      // Reject = delete the relationship
      firestore.deleteDocument('Relationships', id);

      return JSON.stringify({
        status: 'success',
        message: 'Relationship rejected and removed'
      });
    }
  } catch (error: any) {
    Logger.log('Error resolving relationship: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Import relationships from extracted-relationships.json
 */
function migration_importRelationships(fileId: string) {
  try {
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    const data = JSON.parse(content);
    const relationships = data.relationships || data;

    Logger.log(`Importing ${relationships.length} relationships`);

    const firestore = new FirestoreService();
    let imported = 0;
    let errors = 0;

    for (const rel of relationships) {
      try {
        const now = new Date().toISOString();
        rel.createdAt = rel.createdAt || now;
        rel.updatedAt = rel.updatedAt || now;

        firestore.createDocument('Relationships', rel.id, rel);
        imported++;

        if (imported % 100 === 0) {
          Logger.log(`Progress: ${imported}/${relationships.length}`);
        }
      } catch (e: any) {
        errors++;
        Logger.log(`Error importing ${rel.id}: ${e.message}`);
      }
    }

    Logger.log(`Import complete: ${imported} imported, ${errors} errors`);

    return JSON.stringify({
      status: 'success',
      imported,
      errors,
      total: relationships.length
    });
  } catch (error: any) {
    Logger.log('Error: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

// Export relationship API functions
(globalThis as any).api_getCustomerRelationships = api_getCustomerRelationships;
(globalThis as any).api_getUnresolvedRelationships = api_getUnresolvedRelationships;
(globalThis as any).api_createRelationship = api_createRelationship;
(globalThis as any).api_updateRelationship = api_updateRelationship;
(globalThis as any).api_deleteRelationship = api_deleteRelationship;
(globalThis as any).api_resolveRelationship = api_resolveRelationship;
(globalThis as any).migration_importRelationships = migration_importRelationships;

// ============================================================
// Customer Quick Create & Duplicate Detection/Merge API
// ============================================================

/**
 * Quick create customer (minimal fields, for relationship entry)
 */
function api_quickCreateCustomer(data: { name: string; nameKana?: string; phone?: string; relationshipType?: string; relationshipSourceId?: string }) {
  try {
    const customerService = new CustomerService();
    const now = new Date().toISOString();

    const newCustomer = {
      id: `CUS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      nameKana: data.nameKana,
      phone: data.phone,
      createdAt: now,
      updatedAt: now,
    };

    const created = customerService.createCustomer(newCustomer);

    // Invalidate cache
    invalidateCustomerCache();

    return JSON.stringify({
      status: 'success',
      data: transformCustomerForDisplay(created)
    });
  } catch (error: any) {
    Logger.log('Error quick creating customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s\(\)]/g, '');
}

/**
 * Check for potential duplicate customers before saving
 * Used during new customer creation to warn about duplicates
 */
function api_checkForDuplicates(data: { name?: string; phone?: string; email?: string; nameKana?: string }) {
  try {
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(0, 10000); // Get all customers
    const allCustomers = result.data;

    const candidates: Array<{
      customer: any;
      matchScore: number;
      matchReasons: Array<{
        field: string;
        sourceValue: string;
        targetValue: string;
        matchType: 'exact' | 'partial' | 'phonetic';
        confidence: number;
      }>;
    }> = [];

    for (const c of allCustomers) {
      let matchScore = 0;
      const matchReasons: Array<{
        field: string;
        sourceValue: string;
        targetValue: string;
        matchType: 'exact' | 'partial' | 'phonetic';
        confidence: number;
      }> = [];

      // Name exact match
      if (data.name && c.name === data.name) {
        matchScore += 0.5;
        matchReasons.push({
          field: 'name',
          sourceValue: data.name,
          targetValue: c.name,
          matchType: 'exact',
          confidence: 1.0
        });
      }
      // Name partial match
      else if (data.name && c.name && (c.name.includes(data.name) || data.name.includes(c.name))) {
        matchScore += 0.3;
        matchReasons.push({
          field: 'name',
          sourceValue: data.name,
          targetValue: c.name,
          matchType: 'partial',
          confidence: 0.6
        });
      }

      // NameKana exact match
      if (data.nameKana && c.nameKana === data.nameKana) {
        matchScore += 0.3;
        matchReasons.push({
          field: 'nameKana',
          sourceValue: data.nameKana,
          targetValue: c.nameKana || '',
          matchType: 'exact',
          confidence: 0.9
        });
      }

      // Phone exact match
      const customerPhone = extractCleanedValue(c.phone) || extractCleanedValue(c.mobile);
      if (data.phone && customerPhone && normalizePhone(data.phone) === normalizePhone(customerPhone)) {
        matchScore += 0.4;
        matchReasons.push({
          field: 'phone',
          sourceValue: data.phone,
          targetValue: customerPhone,
          matchType: 'exact',
          confidence: 0.95
        });
      }

      // Email exact match
      const customerEmail = extractCleanedValue(c.email);
      if (data.email && customerEmail && data.email.toLowerCase() === customerEmail.toLowerCase()) {
        matchScore += 0.4;
        matchReasons.push({
          field: 'email',
          sourceValue: data.email,
          targetValue: customerEmail,
          matchType: 'exact',
          confidence: 0.95
        });
      }

      if (matchScore >= 0.3 && matchReasons.length > 0) {
        candidates.push({
          customer: transformCustomerForDisplay(c),
          matchScore: Math.min(matchScore, 1.0),
          matchReasons
        });
      }
    }

    // Sort by score and limit to top 10
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const topCandidates = candidates.slice(0, 10);

    return JSON.stringify({
      status: 'success',
      data: topCandidates
    });
  } catch (error: any) {
    Logger.log('Error checking for duplicates: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

/**
 * Find potential duplicate customers for an existing customer
 */
function api_findDuplicates(customerId: string, _options?: { fields?: string[] }) {
  try {
    const customerService = new CustomerService();
    const targetCustomer = customerService.getCustomer(customerId);

    if (!targetCustomer) {
      return JSON.stringify({
        status: 'error',
        message: 'Customer not found',
        data: []
      });
    }

    // Use checkForDuplicates logic with target customer data
    const data = {
      name: targetCustomer.name,
      nameKana: targetCustomer.nameKana,
      phone: extractCleanedValue(targetCustomer.phone) || extractCleanedValue(targetCustomer.mobile),
      email: extractCleanedValue(targetCustomer.email)
    };

    const result = customerService.listCustomersPaginated(0, 10000);
    const allCustomers = result.data.filter((c: any) => c.id !== customerId); // Exclude self

    const candidates: Array<{
      customer: any;
      matchScore: number;
      matchReasons: Array<{
        field: string;
        sourceValue: string;
        targetValue: string;
        matchType: 'exact' | 'partial' | 'phonetic';
        confidence: number;
      }>;
    }> = [];

    for (const c of allCustomers) {
      let matchScore = 0;
      const matchReasons: Array<{
        field: string;
        sourceValue: string;
        targetValue: string;
        matchType: 'exact' | 'partial' | 'phonetic';
        confidence: number;
      }> = [];

      // Name exact match
      if (data.name && c.name === data.name) {
        matchScore += 0.5;
        matchReasons.push({
          field: 'name',
          sourceValue: data.name,
          targetValue: c.name,
          matchType: 'exact',
          confidence: 1.0
        });
      }
      // Name partial match
      else if (data.name && c.name && (c.name.includes(data.name) || data.name.includes(c.name))) {
        matchScore += 0.3;
        matchReasons.push({
          field: 'name',
          sourceValue: data.name,
          targetValue: c.name,
          matchType: 'partial',
          confidence: 0.6
        });
      }

      // NameKana exact match
      if (data.nameKana && c.nameKana === data.nameKana) {
        matchScore += 0.3;
        matchReasons.push({
          field: 'nameKana',
          sourceValue: data.nameKana,
          targetValue: c.nameKana || '',
          matchType: 'exact',
          confidence: 0.9
        });
      }

      // Phone exact match
      const customerPhone = extractCleanedValue(c.phone) || extractCleanedValue(c.mobile);
      if (data.phone && customerPhone && normalizePhone(data.phone) === normalizePhone(customerPhone)) {
        matchScore += 0.4;
        matchReasons.push({
          field: 'phone',
          sourceValue: data.phone,
          targetValue: customerPhone,
          matchType: 'exact',
          confidence: 0.95
        });
      }

      // Email exact match
      const customerEmail = extractCleanedValue(c.email);
      if (data.email && customerEmail && data.email.toLowerCase() === customerEmail.toLowerCase()) {
        matchScore += 0.4;
        matchReasons.push({
          field: 'email',
          sourceValue: data.email,
          targetValue: customerEmail,
          matchType: 'exact',
          confidence: 0.95
        });
      }

      if (matchScore >= 0.3 && matchReasons.length > 0) {
        candidates.push({
          customer: transformCustomerForDisplay(c),
          matchScore: Math.min(matchScore, 1.0),
          matchReasons
        });
      }
    }

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const topCandidates = candidates.slice(0, 10);

    return JSON.stringify({
      status: 'success',
      data: topCandidates
    });
  } catch (error: any) {
    Logger.log('Error finding duplicates: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

/**
 * Get merge preview (without actually merging)
 */
function api_getMergePreview(primaryId: string, secondaryId: string) {
  try {
    const customerService = new CustomerService();
    const primary = customerService.getCustomer(primaryId);
    const secondary = customerService.getCustomer(secondaryId);

    if (!primary || !secondary) {
      return JSON.stringify({
        status: 'error',
        message: 'One or both customers not found'
      });
    }

    const conflicts = detectMergeConflicts(primary, secondary);

    // Create merged preview (defaulting to primary values)
    const mergedCustomer = { ...primary };

    return JSON.stringify({
      status: 'success',
      data: {
        mergedCustomer: transformCustomerForDisplay(mergedCustomer),
        conflicts,
        unresolvedConflicts: conflicts
      }
    });
  } catch (error: any) {
    Logger.log('Error getting merge preview: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Detect conflicts between two customer records
 */
function detectMergeConflicts(primary: any, secondary: any): Array<{ field: string; primaryValue: unknown; secondaryValue: unknown }> {
  const conflicts: Array<{ field: string; primaryValue: unknown; secondaryValue: unknown }> = [];

  const fieldsToCompare = [
    'name', 'nameKana', 'phone', 'mobile', 'email',
    'gender', 'age', 'notes', 'visitRoute', 'receptionist', 'branch'
  ];

  for (const field of fieldsToCompare) {
    const primaryValue = extractCleanedValue((primary as any)[field]) || (primary as any)[field];
    const secondaryValue = extractCleanedValue((secondary as any)[field]) || (secondary as any)[field];

    if (primaryValue !== secondaryValue && (primaryValue || secondaryValue)) {
      conflicts.push({
        field,
        primaryValue,
        secondaryValue
      });
    }
  }

  // Compare address fields
  if (primary.address || secondary.address) {
    const addressFields = ['postalCode', 'prefecture', 'city', 'town', 'building'];
    for (const field of addressFields) {
      const primaryValue = primary.address ? extractCleanedValue(primary.address[field]) || primary.address[field] : null;
      const secondaryValue = secondary.address ? extractCleanedValue(secondary.address[field]) || secondary.address[field] : null;

      if (primaryValue !== secondaryValue && (primaryValue || secondaryValue)) {
        conflicts.push({
          field: `address.${field}`,
          primaryValue,
          secondaryValue
        });
      }
    }
  }

  return conflicts;
}

/**
 * Merge two customer records
 */
function api_mergeCustomers(
  primaryId: string,
  secondaryId: string,
  conflictResolutions: Record<string, 'primary' | 'secondary' | unknown>
) {
  try {
    const customerService = new CustomerService();
    const firestore = new FirestoreService();
    const primary = customerService.getCustomer(primaryId);
    const secondary = customerService.getCustomer(secondaryId);

    if (!primary || !secondary) {
      return JSON.stringify({
        status: 'error',
        message: 'One or both customers not found'
      });
    }

    // Build merged customer data
    const mergedData: Record<string, any> = { ...primary };
    const now = new Date().toISOString();

    // Apply conflict resolutions
    for (const [field, resolution] of Object.entries(conflictResolutions)) {
      if (resolution === 'secondary') {
        if (field.startsWith('address.')) {
          const addressField = field.replace('address.', '');
          if (!mergedData.address) mergedData.address = {};
          (mergedData.address as Record<string, any>)[addressField] = secondary.address ? (secondary.address as Record<string, any>)[addressField] : null;
        } else {
          mergedData[field] = (secondary as any)[field];
        }
      } else if (resolution !== 'primary' && resolution !== undefined) {
        // Custom value
        if (field.startsWith('address.')) {
          const addressField = field.replace('address.', '');
          if (!mergedData.address) mergedData.address = {};
          mergedData.address[addressField] = resolution;
        } else {
          mergedData[field] = resolution;
        }
      }
    }

    mergedData.updatedAt = now;

    // Update primary customer with merged data
    const updatedCustomer = customerService.updateCustomer(primaryId, mergedData);

    // Move relationships from secondary to primary
    const secondaryRelationships = firestore.queryDocuments('Relationships', {
      where: [{ field: 'sourceCustomerId', op: '==', value: secondaryId }]
    });
    const secondaryTargetRelationships = firestore.queryDocuments('Relationships', {
      where: [{ field: 'targetCustomerId', op: '==', value: secondaryId }]
    });

    // Update source relationships
    for (const rel of secondaryRelationships) {
      firestore.updateDocument('Relationships', (rel as any).id, {
        sourceCustomerId: primaryId,
        updatedAt: now
      });
    }

    // Update target relationships
    for (const rel of secondaryTargetRelationships) {
      firestore.updateDocument('Relationships', (rel as any).id, {
        targetCustomerId: primaryId,
        updatedAt: now
      });
    }

    // Soft delete secondary customer (using any type to bypass strict Customer type check)
    customerService.updateCustomer(secondaryId, {
      deletedAt: now,
      updatedAt: now
    } as any);

    // Invalidate cache
    invalidateCustomerCache();

    const conflicts = detectMergeConflicts(primary, secondary);

    return JSON.stringify({
      status: 'success',
      data: {
        mergedCustomer: transformCustomerForDisplay(updatedCustomer),
        conflicts,
        unresolvedConflicts: []
      }
    });
  } catch (error: any) {
    Logger.log('Error merging customers: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Search customers by query (name, kana, phone, email)
 */
function api_searchCustomers(query: string) {
  try {
    const customerService = new CustomerService();
    const result = customerService.listCustomersPaginated(0, 10000);

    const normalizedQuery = query.toLowerCase();

    const matches = result.data.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const kana = (c.nameKana || '').toLowerCase();
      const phone = normalizePhone(extractCleanedValue(c.phone) || extractCleanedValue(c.mobile) || '');
      const email = (extractCleanedValue(c.email) || '').toLowerCase();

      return name.includes(normalizedQuery) ||
             kana.includes(normalizedQuery) ||
             phone.includes(normalizePhone(query)) ||
             email.includes(normalizedQuery);
    });

    return JSON.stringify({
      status: 'success',
      data: matches.slice(0, 50).map((c: any) => transformCustomerForDisplay(c))
    });
  } catch (error: any) {
    Logger.log('Error searching customers: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: []
    });
  }
}

/**
 * Create a new customer (full)
 */
function api_createCustomer(data: Record<string, any>) {
  try {
    const customerService = new CustomerService();
    const now = new Date().toISOString();

    const newCustomer = {
      id: data.id || `CUS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'Unknown',
      ...data,
      createdAt: now,
      updatedAt: now
    };

    const created = customerService.createCustomer(newCustomer as any);

    // Invalidate cache
    invalidateCustomerCache();

    return JSON.stringify({
      status: 'success',
      data: transformCustomerForDisplay(created)
    });
  } catch (error: any) {
    Logger.log('Error creating customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Delete customer (soft delete)
 */
function api_deleteCustomer(id: string) {
  try {
    const customerService = new CustomerService();
    const now = new Date().toISOString();

    customerService.updateCustomer(id, {
      deletedAt: now,
      updatedAt: now
    });

    // Invalidate cache
    invalidateCustomerCache();

    return JSON.stringify({
      status: 'success',
      message: 'Customer deleted'
    });
  } catch (error: any) {
    Logger.log('Error deleting customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message
    });
  }
}

// Export new customer API functions
(globalThis as any).api_quickCreateCustomer = api_quickCreateCustomer;
(globalThis as any).api_checkForDuplicates = api_checkForDuplicates;
(globalThis as any).api_findDuplicates = api_findDuplicates;
(globalThis as any).api_getMergePreview = api_getMergePreview;
(globalThis as any).api_mergeCustomers = api_mergeCustomers;
(globalThis as any).api_searchCustomers = api_searchCustomers;
(globalThis as any).api_createCustomer = api_createCustomer;
(globalThis as any).api_deleteCustomer = api_deleteCustomer;

// ============================================================
// SFA (Sales Force Automation) API - 商談管理
// シンプル化: ITリテラシーの低いユーザー向け
// ============================================================

type DealStage = 'INQUIRY' | 'CONTACTED' | 'VISITED' | 'NEGOTIATING' | 'WON' | 'LOST';
type LeadSource = 'WEB' | 'PHONE' | 'REFERRAL' | 'EVENT' | 'LEAFLET' | 'OTHER';
type Area = '東京' | '神奈川' | '埼玉' | '千葉' | 'その他';

interface Deal {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  templeName: string;
  area: Area;
  planName?: string;
  amount?: number;
  stage: DealStage;
  source?: LeadSource;
  assignedTo?: string;
  inquiryDate?: string;
  visitDate?: string;
  expectedCloseDate?: string;
  notes?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const STAGE_PROBABILITIES: Record<DealStage, number> = {
  INQUIRY: 10,
  CONTACTED: 30,
  VISITED: 50,
  NEGOTIATING: 70,
  WON: 100,
  LOST: 0,
};

/**
 * 商談一覧を取得
 */
function api_getDeals(options?: {
  stage?: DealStage[];
  area?: Area[];
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const firestore = new FirestoreService();
    const allDeals = firestore.queryDocuments('Deals', {
      orderBy: { field: 'updatedAt', direction: 'DESCENDING' }
    }) as Deal[];

    // フィルタリング（削除済みを除外）
    let filtered = allDeals.filter(d => !d.deletedAt);

    if (options?.stage?.length) {
      filtered = filtered.filter(d => options.stage!.includes(d.stage));
    }
    if (options?.area?.length) {
      filtered = filtered.filter(d => options.area!.includes(d.area));
    }
    if (options?.assignedTo) {
      filtered = filtered.filter(d => d.assignedTo === options.assignedTo);
    }

    const page = options?.page ?? 0;
    const pageSize = options?.pageSize ?? 50;
    const start = page * pageSize;

    return JSON.stringify({
      status: 'success',
      data: {
        data: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize
      }
    });
  } catch (error: any) {
    Logger.log('Error getting deals: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談詳細を取得
 */
function api_getDeal(dealId: string) {
  try {
    const firestore = new FirestoreService();
    const deal = firestore.getDocument('Deals', dealId);

    if (!deal) {
      return JSON.stringify({ status: 'error', message: 'Deal not found' });
    }

    return JSON.stringify({ status: 'success', data: deal });
  } catch (error: any) {
    Logger.log('Error getting deal: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談を作成
 */
function api_createDeal(data: {
  customerName: string;
  templeName: string;
  area?: Area;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  planName?: string;
  amount?: number;
  source?: LeadSource;
  assignedTo?: string;
  notes?: string;
}) {
  try {
    const firestore = new FirestoreService();
    const now = new Date().toISOString();

    const newDeal: Deal = {
      id: `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerId: data.customerId,
      templeName: data.templeName,
      area: data.area || 'その他',
      planName: data.planName,
      amount: data.amount,
      stage: 'INQUIRY',
      source: data.source,
      assignedTo: data.assignedTo,
      inquiryDate: now.split('T')[0],
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    firestore.createDocument('Deals', newDeal.id, newDeal);

    return JSON.stringify({ status: 'success', data: newDeal });
  } catch (error: any) {
    Logger.log('Error creating deal: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談を更新
 */
function api_updateDeal(dealId: string, data: Partial<Deal>) {
  try {
    const firestore = new FirestoreService();
    const existing = firestore.getDocument('Deals', dealId) as Deal;

    if (!existing) {
      return JSON.stringify({ status: 'error', message: 'Deal not found' });
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    firestore.updateDocument('Deals', dealId, updated);

    return JSON.stringify({ status: 'success', data: updated });
  } catch (error: any) {
    Logger.log('Error updating deal: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談のステージを変更（日付自動更新付き）
 */
function api_updateDealStage(dealId: string, newStage: DealStage, notes?: string) {
  try {
    const firestore = new FirestoreService();
    const existing = firestore.getDocument('Deals', dealId) as Deal;

    if (!existing) {
      return JSON.stringify({ status: 'error', message: 'Deal not found' });
    }

    const now = new Date().toISOString();
    const updates: Partial<Deal> = {
      stage: newStage,
      updatedAt: now,
    };

    // ステージに応じて日付を自動設定
    if (newStage === 'VISITED' && !existing.visitDate) {
      updates.visitDate = now.split('T')[0];
    }

    // メモを追記
    if (notes) {
      const timestamp = now.split('T')[0];
      updates.notes = (existing.notes || '') + `\n[${timestamp}] ${notes}`;
    }

    const updated = { ...existing, ...updates };
    firestore.updateDocument('Deals', dealId, updated);

    return JSON.stringify({ status: 'success', data: updated });
  } catch (error: any) {
    Logger.log('Error updating deal stage: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談を削除（論理削除）
 */
function api_deleteDeal(dealId: string) {
  try {
    const firestore = new FirestoreService();
    const now = new Date().toISOString();

    firestore.updateDocument('Deals', dealId, {
      deletedAt: now,
      updatedAt: now,
    });

    return JSON.stringify({ status: 'success', message: 'Deal deleted' });
  } catch (error: any) {
    Logger.log('Error deleting deal: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * パイプラインサマリーを取得（ダッシュボード用）
 */
function api_getPipelineSummary(options?: { area?: Area[]; assignedTo?: string }) {
  try {
    const firestore = new FirestoreService();
    const allDeals = firestore.queryDocuments('Deals', {}) as Deal[];

    // フィルタリング
    let filtered = allDeals.filter(d => !d.deletedAt);

    if (options?.area?.length) {
      filtered = filtered.filter(d => options.area!.includes(d.area));
    }
    if (options?.assignedTo) {
      filtered = filtered.filter(d => d.assignedTo === options.assignedTo);
    }

    // ステージ別集計
    const stages: DealStage[] = ['INQUIRY', 'CONTACTED', 'VISITED', 'NEGOTIATING', 'WON', 'LOST'];
    const stageLabels: Record<DealStage, string> = {
      INQUIRY: '問い合わせ',
      CONTACTED: '連絡済み',
      VISITED: '見学済み',
      NEGOTIATING: '商談中',
      WON: '成約',
      LOST: '失注',
    };

    const byStage = stages.map(stage => {
      const stageDeals = filtered.filter(d => d.stage === stage);
      return {
        stage,
        label: stageLabels[stage],
        count: stageDeals.length,
        totalAmount: stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      };
    });

    // 全体集計
    let totalAmount = 0;
    let expectedAmount = 0;

    for (const deal of filtered) {
      totalAmount += deal.amount || 0;
      expectedAmount += (deal.amount || 0) * (STAGE_PROBABILITIES[deal.stage] / 100);
    }

    // 今月のデータ
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthNew = filtered.filter(d => d.createdAt.startsWith(thisMonth));
    const thisMonthWon = filtered.filter(d => d.stage === 'WON' && d.updatedAt.startsWith(thisMonth));

    return JSON.stringify({
      status: 'success',
      data: {
        byStage,
        totalDeals: filtered.length,
        totalAmount,
        expectedAmount,
        thisMonth: {
          newDeals: thisMonthNew.length,
          wonDeals: thisMonthWon.length,
          wonAmount: thisMonthWon.reduce((sum, d) => sum + (d.amount || 0), 0),
        },
      }
    });
  } catch (error: any) {
    Logger.log('Error getting pipeline summary: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 寺院一覧を取得
 */
function api_getTemples() {
  try {
    const firestore = new FirestoreService();
    const temples = firestore.queryDocuments('Temples', {
      where: [{ field: 'isActive', op: '==', value: true }],
      orderBy: { field: 'name', direction: 'ASCENDING' }
    });

    return JSON.stringify({ status: 'success', data: temples });
  } catch (error: any) {
    Logger.log('Error getting temples: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * エリア別寺院一覧を取得
 */
function api_getTemplesByArea(area: Area) {
  try {
    const firestore = new FirestoreService();
    const temples = firestore.queryDocuments('Temples', {
      where: [
        { field: 'area', op: '==', value: area },
        { field: 'isActive', op: '==', value: true }
      ],
      orderBy: { field: 'name', direction: 'ASCENDING' }
    });

    return JSON.stringify({ status: 'success', data: temples });
  } catch (error: any) {
    Logger.log('Error getting temples by area: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

// Export SFA API functions
(globalThis as any).api_getDeals = api_getDeals;
(globalThis as any).api_getDeal = api_getDeal;
(globalThis as any).api_createDeal = api_createDeal;
(globalThis as any).api_updateDeal = api_updateDeal;
(globalThis as any).api_updateDealStage = api_updateDealStage;
(globalThis as any).api_deleteDeal = api_deleteDeal;
(globalThis as any).api_getPipelineSummary = api_getPipelineSummary;
(globalThis as any).api_getTemples = api_getTemples;
(globalThis as any).api_getTemplesByArea = api_getTemplesByArea;

// ============================================================
// 商談バッチインポートAPI（データ移行用）
// ============================================================

/**
 * 商談を一括インポート
 * @param jsonData JSON形式の商談データ配列
 */
function migration_importDeals(jsonData: string) {
  try {
    const deals = JSON.parse(jsonData);
    if (!Array.isArray(deals)) {
      return JSON.stringify({ status: 'error', message: 'Invalid data format: expected array' });
    }

    const firestore = new FirestoreService();
    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const deal of deals) {
      try {
        // 必須フィールドチェック
        if (!deal.customerName || !deal.templeName) {
          skipped++;
          continue;
        }

        // 重複チェック（顧客名+寺院名）
        const existing = firestore.queryDocuments('Deals', {
          where: [
            { field: 'customerName', op: '==', value: deal.customerName },
            { field: 'templeName', op: '==', value: deal.templeName }
          ]
        });

        if (existing.length > 0) {
          // 既存データを更新（より詳細な情報で上書き）
          const existingDeal = existing[0] as Deal;
          const updates: Partial<Deal> = { updatedAt: now };

          if (deal.amount && !existingDeal.amount) updates.amount = deal.amount;
          if (deal.planName && !existingDeal.planName) updates.planName = deal.planName;
          if (deal.customerId && !existingDeal.customerId) updates.customerId = deal.customerId;
          if (deal.customerPhone && !existingDeal.customerPhone) updates.customerPhone = deal.customerPhone;
          if (deal.assignedTo && !existingDeal.assignedTo) updates.assignedTo = deal.assignedTo;
          if (deal.notes) {
            updates.notes = existingDeal.notes
              ? `${existingDeal.notes}\n\n--- インポート追記 ---\n${deal.notes}`
              : deal.notes;
          }

          // ステージは進んでいる方を採用
          const stageOrder = ['INQUIRY', 'CONTACTED', 'VISITED', 'NEGOTIATING', 'WON', 'LOST'];
          if (stageOrder.indexOf(deal.stage) > stageOrder.indexOf(existingDeal.stage)) {
            updates.stage = deal.stage;
          }

          if (Object.keys(updates).length > 1) {
            firestore.updateDocument('Deals', existingDeal.id, updates);
          }
          skipped++;
        } else {
          // 新規作成
          const newDeal: Deal = {
            id: deal.id || `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            customerName: deal.customerName,
            customerPhone: deal.customerPhone || undefined,
            customerEmail: deal.customerEmail || undefined,
            customerId: deal.customerId || undefined,
            templeName: deal.templeName,
            area: deal.area || 'その他',
            planName: deal.planName || undefined,
            amount: deal.amount || undefined,
            stage: deal.stage || 'INQUIRY',
            source: deal.source || undefined,
            assignedTo: deal.assignedTo || undefined,
            inquiryDate: deal.inquiryDate || now.split('T')[0],
            visitDate: deal.visitDate || undefined,
            expectedCloseDate: deal.expectedCloseDate || undefined,
            notes: deal.notes || undefined,
            nextAction: deal.nextAction || undefined,
            createdAt: deal.createdAt || now,
            updatedAt: now,
          };

          firestore.createDocument('Deals', newDeal.id, newDeal);
          imported++;
        }
      } catch (err: any) {
        errors.push(`${deal.customerName}: ${err.message}`);
      }
    }

    return JSON.stringify({
      status: 'success',
      data: {
        total: deals.length,
        imported,
        skipped,
        errors: errors.slice(0, 10) // 最初の10件のみ
      }
    });
  } catch (error: any) {
    Logger.log('Error importing deals: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 寺院マスタを一括インポート
 */
function migration_importTemples(jsonData: string) {
  try {
    const temples = JSON.parse(jsonData);
    if (!Array.isArray(temples)) {
      return JSON.stringify({ status: 'error', message: 'Invalid data format: expected array' });
    }

    const firestore = new FirestoreService();
    const now = new Date().toISOString();
    let imported = 0;

    for (const temple of temples) {
      if (!temple.name) continue;

      const id = temple.id || `TEMPLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      firestore.createDocument('Temples', id, {
        id,
        name: temple.name,
        area: temple.area || 'その他',
        isActive: temple.isActive !== false,
        createdAt: now,
        updatedAt: now,
      });

      imported++;
    }

    return JSON.stringify({
      status: 'success',
      data: { total: temples.length, imported }
    });
  } catch (error: any) {
    Logger.log('Error importing temples: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談データをすべて削除（テスト用）
 */
function migration_deleteAllDeals() {
  try {
    const firestore = new FirestoreService();
    const deals = firestore.queryDocuments('Deals', {});

    let deleted = 0;
    for (const deal of deals) {
      firestore.deleteDocument('Deals', (deal as any).id);
      deleted++;
    }

    return JSON.stringify({
      status: 'success',
      data: { deleted }
    });
  } catch (error: any) {
    Logger.log('Error deleting deals: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

/**
 * 商談件数を取得
 */
function migration_getDealCount() {
  try {
    const firestore = new FirestoreService();
    const deals = firestore.queryDocuments('Deals', {});

    return JSON.stringify({
      status: 'success',
      data: { count: deals.length }
    });
  } catch (error: any) {
    Logger.log('Error getting deal count: ' + error.message);
    return JSON.stringify({ status: 'error', message: error.message });
  }
}

// Export migration functions
(globalThis as any).migration_importDeals = migration_importDeals;
(globalThis as any).migration_importTemples = migration_importTemples;
(globalThis as any).migration_deleteAllDeals = migration_deleteAllDeals;
(globalThis as any).migration_getDealCount = migration_getDealCount;