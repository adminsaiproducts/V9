/// <reference types="vite/client" />

/**
 * Extend Window interface for CRM V9
 */
interface Window {
  /**
   * Initial state injected from server for deep-linking
   */
  CRM_INITIAL_STATE?: {
    view: string | null;
    id: string | null;
    timestamp: string;
  };
}
