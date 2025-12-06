import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component to handle server-side deep-linking parameters
 * Reads window.CRM_INITIAL_STATE and navigates to the appropriate route
 *
 * Supported parameters:
 * - view: 'customer_detail' | 'customers' | 'dashboard'
 * - id: Customer ID (for customer_detail view)
 * - q: Search query (for customers view)
 */
export const DeepLinkHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if initial state exists
    const initialState = (window as any).CRM_INITIAL_STATE;

    if (!initialState) {
      console.log('[DeepLinkHandler] No initial state found');
      return;
    }

    console.log('[DeepLinkHandler] Initial state:', initialState);

    // Route based on view parameter
    if (initialState.view === 'customer_detail' && initialState.id) {
      console.log(`[DeepLinkHandler] Navigating to /customers/${initialState.id}`);
      navigate(`/customers/${initialState.id}`, { replace: true });
    } else if (initialState.view === 'customers') {
      // 検索クエリがある場合はURLパラメータとして渡す
      const searchQuery = initialState.q || '';
      const path = searchQuery ? `/customers?q=${encodeURIComponent(searchQuery)}` : '/customers';
      console.log(`[DeepLinkHandler] Navigating to ${path}`);
      navigate(path, { replace: true });
    } else if (initialState.view === 'dashboard') {
      console.log('[DeepLinkHandler] Navigating to /dashboard');
      navigate('/dashboard', { replace: true });
    }

    // Clear initial state after consumption
    delete (window as any).CRM_INITIAL_STATE;
  }, [navigate]);

  return null; // This component doesn't render anything
};
