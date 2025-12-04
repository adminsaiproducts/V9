
/**
 * CRM V9 Migration Master Script
 *
 * Generated: 2025-12-03T13:33:25.564Z
 * Total customers: 10852
 * Total batches: 218
 * Batch size: 50
 *
 * 使用方法:
 * 1. このファイルをGASプロジェクトに追加
 * 2. Google DriveにJSONファイルをアップロード
 * 3. FILE_IDを設定
 * 4. migration_deleteAllCustomers() を実行
 * 5. migration_runFullImport() を実行
 */

// Google Drive上のJSONファイルID（アップロード後に設定）
const MIGRATION_FILE_ID = 'YOUR_FILE_ID_HERE';

/**
 * Delete all customers and run full import
 */
function runFullMigration() {
  Logger.log('=== CRM V9 Full Migration ===');

  // Step 1: Delete existing customers
  Logger.log('Step 1: Deleting existing customers...');
  const deleteResult = migration_deleteAllCustomers();
  Logger.log('Delete result: ' + deleteResult);

  // Wait a bit
  Utilities.sleep(2000);

  // Step 2: Import all customers
  Logger.log('Step 2: Importing customers from Google Drive...');
  const importResult = migration_runFullImport(MIGRATION_FILE_ID);
  Logger.log('Import result: ' + importResult);

  // Step 3: Verify
  Logger.log('Step 3: Verifying...');
  const countResult = migration_getCustomerCount();
  Logger.log('Count result: ' + countResult);

  Logger.log('=== Migration Complete ===');
}

/**
 * Import specific batch range (for recovery)
 */
function importBatchRange(fileId, startBatch, endBatch) {
  const batchSize = 50;

  const file = DriveApp.getFileById(fileId);
  const content = file.getBlob().getDataAsString();
  const allCustomers = JSON.parse(content);

  const customerService = new CustomerService();
  let totalImported = 0;
  let totalErrors = 0;

  for (let batch = startBatch; batch <= endBatch; batch++) {
    const startIdx = batch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, allCustomers.length);
    const customers = allCustomers.slice(startIdx, endIdx);

    Logger.log('Processing batch ' + batch + ': ' + startIdx + ' to ' + endIdx);

    for (const customer of customers) {
      try {
        const now = new Date().toISOString();
        customer.createdAt = customer.createdAt || now;
        customer.updatedAt = customer.updatedAt || now;
        customerService.createCustomer(customer);
        totalImported++;
      } catch (err) {
        totalErrors++;
        Logger.log('Error: ' + customer.id + ': ' + err.message);
      }
    }

    Utilities.sleep(500);
  }

  Logger.log('Batch range complete: ' + totalImported + ' imported, ' + totalErrors + ' errors');
  return JSON.stringify({ totalImported, totalErrors });
}
