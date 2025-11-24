import { Config, getProperty } from '../config';
import { AuditLog } from '../types/firestore';

// Types for Firestore REST API
interface FirestoreField {
  stringValue?: string;
  integerValue?: string | number;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields: Record<string, FirestoreField> };
  arrayValue?: { values: FirestoreField[] };
  timestampValue?: string;
}

interface FirestoreResponse {
  name: string;
  fields: Record<string, FirestoreField>;
  createTime: string;
  updateTime: string;
}

/**
 * Firestore Service for Google Apps Script
 * Uses Service Account for authentication and REST API for data access.
 */
export class FirestoreService {
  private email: string;
  private key: string;
  private projectId: string;
  private databaseId: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.email = getProperty(Config.PROPERTIES.FIRESTORE_EMAIL);
    this.key = getProperty(Config.PROPERTIES.FIRESTORE_KEY).replace(/\\n/g, '\n');
    this.projectId = getProperty(Config.PROPERTIES.FIRESTORE_PROJECT_ID);
    // Optional: Default to '(default)' if not set
    try {
      this.databaseId = getProperty(Config.PROPERTIES.FIRESTORE_DATABASE_ID);
    } catch (e) {
      this.databaseId = '(default)';
    }
  }

  /**
   * Get valid OAuth 2.0 Token
   */
  private getAccessToken(): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.tokenExpiry > now + 60) {
      return this.token;
    }

    const jwtHeader = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const jwtClaim = JSON.stringify({
      iss: this.email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    });

    const toSign = `${Utilities.base64EncodeWebSafe(jwtHeader)}.${Utilities.base64EncodeWebSafe(jwtClaim)}`;
    const signatureBytes = Utilities.computeRsaSha256Signature(toSign, this.key);
    const signature = Utilities.base64EncodeWebSafe(signatureBytes);
    const jwt = `${toSign}.${signature}`;

    const payload = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    };

    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to get Access Token: ${response.getContentText()}`);
    }

    const data = JSON.parse(response.getContentText());
    this.token = data.access_token;
    this.tokenExpiry = now + 3600;
    
    return this.token!;
  }

  /**
   * Create or Update a document with a specified ID
   * Uses patch to support upsert behavior
   */
  setDocument<T extends object>(collection: string, id: string, data: T): void {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${id}`;
    
    const firestoreData = this.toFirestoreValue(data as unknown as Record<string, unknown>);

    // Using PATCH with local field mask is complex in REST, 
    // simpler to overwrite or assume full object for now if using strict types.
    // But to be safe with REST, we'll use patch but without mask to replace fields present.
    const response = UrlFetchApp.fetch(url, {
      method: 'patch', 
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      contentType: 'application/json',
      payload: JSON.stringify({ fields: firestoreData }),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
       throw new Error(`Firestore Set Failed (${collection}/${id}): ${response.getContentText()}`);
    }
    
    // We don't need to return the response as we assume success if no error thrown
  }

  /**
   * Get a document by ID
   */
  getDocument<T>(collection: string, id: string): T | null {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${id}`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 404) {
      return null;
    }

    if (response.getResponseCode() !== 200) {
      throw new Error(`Firestore Get Failed (${collection}/${id}): ${response.getContentText()}`);
    }

    const json = JSON.parse(response.getContentText()) as FirestoreResponse;
    if (!json.fields) return {} as T;
    
    return this.fromFirestoreValue(json.fields) as T;
  }

  /**
   * Simple helper to convert JS object to Firestore Value format.
   */
  private toFirestoreValue(data: Record<string, unknown>): Record<string, FirestoreField> {
    const fields: Record<string, FirestoreField> = {};
    for (const key in data) {
      const value = data[key];
      if (value === null || value === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
           fields[key] = { integerValue: value.toString() }; // Firestore Integer is a string (int64)
        } else {
           fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
         fields[key] = { arrayValue: { values: value.map(v => {
             // Wrap primitive types in an object to use recursive call if possible, 
             // but cleaner to handle primitives directly or construct a single-value object wrapper hack
             // Simplified: Assume arrays contain objects or primitives.
             if (typeof v === 'object' && v !== null) {
                 return { mapValue: { fields: this.toFirestoreValue(v as Record<string, unknown>) } };
             } else {
                 // Primitive in array
                 // We can reuse the logic by creating a dummy object but let's just duplicate slightly for safety
                 if (typeof v === 'string') return { stringValue: v };
                 if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: v.toString() } : { doubleValue: v };
                 if (typeof v === 'boolean') return { booleanValue: v };
                 return { nullValue: null };
             }
         }) } };
      } else if (typeof value === 'object') {
         fields[key] = { mapValue: { fields: this.toFirestoreValue(value as Record<string, unknown>) } };
      }
    }
    return fields;
  }

  /**
   * Create an Audit Log entry
   */
  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): void {
    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    const fullLog: AuditLog = {
      ...log,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    // In GAS, operations are synchronous.
    // We intentionally block to ensure audit trail is secure.
    // Cast fullLog to Record<string, unknown> which is true for AuditLog interface
    this.setDocument(Config.COLLECTIONS.AUDIT_LOGS, id, fullLog as unknown as Record<string, unknown>);
  }

  /**
   * Helper to convert Firestore Value format back to JS object
   */
  private fromFirestoreValue(fields: Record<string, FirestoreField>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (!fields) return data;

    for (const key in fields) {
      const value = fields[key];
      if (value.stringValue !== undefined) data[key] = value.stringValue;
      else if (value.integerValue !== undefined) data[key] = parseInt(String(value.integerValue), 10);
      else if (value.doubleValue !== undefined) data[key] = value.doubleValue;
      else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
      else if (value.nullValue !== undefined) data[key] = null;
      else if (value.mapValue) data[key] = this.fromFirestoreValue(value.mapValue.fields);
      else if (value.arrayValue) {
        data[key] = (value.arrayValue.values || []).map((v) => {
           if (v.stringValue !== undefined) return v.stringValue;
           if (v.integerValue !== undefined) return parseInt(String(v.integerValue), 10);
           if (v.doubleValue !== undefined) return v.doubleValue;
           if (v.booleanValue !== undefined) return v.booleanValue;
           if (v.mapValue) return this.fromFirestoreValue(v.mapValue.fields);
           return null;
        });
      }
    }
    return data;
  }
}