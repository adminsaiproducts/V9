/**
 * Configuration management for CRM V9
 */

export const Config = {
  // Script Properties Keys
  PROPERTIES: {
    FIRESTORE_EMAIL: 'FIRESTORE_EMAIL',
    FIRESTORE_KEY: 'FIRESTORE_KEY',
    FIRESTORE_PROJECT_ID: 'FIRESTORE_PROJECT_ID',
    FIRESTORE_DATABASE_ID: 'FIRESTORE_DATABASE_ID',
  },

  // Collection Names (Single Source of Truth)
  COLLECTIONS: {
    CUSTOMERS: 'Customers',
    DEALS: 'Deals',
    TEMPLES: 'Temples',
    TRANSACTION_CATEGORIES: 'TransactionCategories',
    RELATIONSHIP_TYPES: 'RelationshipTypes',
    AUDIT_LOGS: 'AuditLogs',
    AI_CACHE: 'AICache',
  },

  // System Constants
  APP_NAME: 'CRM V9',
  VERSION: '9.0.0',
};

/**
 * Helper to get property or throw error if missing
 */
export function getProperty(key: string): string {
  const scriptProperties = PropertiesService.getScriptProperties();
  const value = scriptProperties.getProperty(key);
  if (!value) {
    throw new Error(`Missing Script Property: ${key}`);
  }
  return value;
}