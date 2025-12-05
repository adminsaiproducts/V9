const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve(__dirname, '../dist/bundle.js');
const bridgeCode = `
/* ==============================================
   GAS Editor Recognition Bridge (Auto-Injected)
   ============================================== */
function doGet(e) { return globalThis.doGet(e); }
function doPost(e) { return globalThis.doPost(e); }

function api_getCustomers() { return globalThis.api_getCustomers(); }
function api_getCustomersPaginated(pageOrOptions, pageSizeArg, sortFieldArg, sortOrderArg) {
  return globalThis.api_getCustomersPaginated(pageOrOptions, pageSizeArg, sortFieldArg, sortOrderArg);
}
function api_getCustomerById(id) { return globalThis.api_getCustomerById(id); }
function api_updateCustomer(id, updates) { return globalThis.api_updateCustomer(id, updates); }
function api_debugFirestore() { return globalThis.api_debugFirestore(); }

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* Migration Functions */
function migration_deleteAllCustomers() { return globalThis.migration_deleteAllCustomers(); }
function migration_importCustomers(jsonData) { return globalThis.migration_importCustomers(jsonData); }
function migration_importCustomersBatch(jsonData, batchNumber) { return globalThis.migration_importCustomersBatch(jsonData, batchNumber); }
function migration_getCustomerCount() { return globalThis.migration_getCustomerCount(); }
function migration_importFromDrive(fileId, startIndex, batchSize) { return globalThis.migration_importFromDrive(fileId, startIndex, batchSize); }
function migration_runFullImport(fileId) { return globalThis.migration_runFullImport(fileId); }
function migration_resumeImport(fileId) { return globalThis.migration_resumeImport(fileId); }
function migration_resetProgress() { return globalThis.migration_resetProgress(); }
function migration_getProgress() { return globalThis.migration_getProgress(); }
function runFullImport() { return globalThis.runFullImport(); }
function resumeImport() { return globalThis.resumeImport(); }

/* OPTIMIZED: Batch Import Functions (500 records per API call) */
function migration_batchImport(fileId) { return globalThis.migration_batchImport(fileId); }
function migration_resetBatchProgress() { return globalThis.migration_resetBatchProgress(); }
function migration_getBatchProgress() { return globalThis.migration_getBatchProgress(); }
function batchImport() { return globalThis.batchImport(); }

/* Relationship API Functions */
function api_getCustomerRelationships(customerId) { return globalThis.api_getCustomerRelationships(customerId); }
function api_getUnresolvedRelationships() { return globalThis.api_getUnresolvedRelationships(); }
function api_createRelationship(data) { return globalThis.api_createRelationship(data); }
function api_updateRelationship(id, updates) { return globalThis.api_updateRelationship(id, updates); }
function api_deleteRelationship(id) { return globalThis.api_deleteRelationship(id); }
function api_resolveRelationship(id, confirmed, resolvedBy) { return globalThis.api_resolveRelationship(id, confirmed, resolvedBy); }
function migration_importRelationships(fileId) { return globalThis.migration_importRelationships(fileId); }

/* Customer Quick Create & Duplicate Detection/Merge API */
function api_quickCreateCustomer(data) { return globalThis.api_quickCreateCustomer(data); }
function api_checkForDuplicates(data) { return globalThis.api_checkForDuplicates(data); }
function api_findDuplicates(customerId, options) { return globalThis.api_findDuplicates(customerId, options); }
function api_getMergePreview(primaryId, secondaryId) { return globalThis.api_getMergePreview(primaryId, secondaryId); }
function api_mergeCustomers(primaryId, secondaryId, conflictResolutions) { return globalThis.api_mergeCustomers(primaryId, secondaryId, conflictResolutions); }
function api_searchCustomers(query) { return globalThis.api_searchCustomers(query); }
function api_createCustomer(data) { return globalThis.api_createCustomer(data); }
function api_deleteCustomer(id) { return globalThis.api_deleteCustomer(id); }

/* SFA (Sales Force Automation) - 商談管理 API */
function api_getDeals(options) { return globalThis.api_getDeals(options); }
function api_getDeal(dealId) { return globalThis.api_getDeal(dealId); }
function api_createDeal(data) { return globalThis.api_createDeal(data); }
function api_updateDeal(dealId, data) { return globalThis.api_updateDeal(dealId, data); }
function api_updateDealStage(dealId, newStage, notes) { return globalThis.api_updateDealStage(dealId, newStage, notes); }
function api_deleteDeal(dealId) { return globalThis.api_deleteDeal(dealId); }
function api_getPipelineSummary(options) { return globalThis.api_getPipelineSummary(options); }
function api_getTemples() { return globalThis.api_getTemples(); }
function api_getTemplesByArea(area) { return globalThis.api_getTemplesByArea(area); }

/* Deal Migration Functions */
function migration_importDeals(jsonData) { return globalThis.migration_importDeals(jsonData); }
function migration_importTemples(jsonData) { return globalThis.migration_importTemples(jsonData); }
function migration_deleteAllDeals() { return globalThis.migration_deleteAllDeals(); }
function migration_getDealCount() { return globalThis.migration_getDealCount(); }
`;

try {
    if (fs.existsSync(bundlePath)) {
        fs.appendFileSync(bundlePath, bridgeCode);
        console.log('✅ GAS Bridge code injected successfully.');
    } else {
        console.error('❌ dist/bundle.js not found!');
        process.exit(1);
    }
} catch (err) {
    console.error('❌ Failed to inject bridge code:', err);
    process.exit(1);
}
