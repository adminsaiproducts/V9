import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component to handle server-side deep-linking parameters
 * Reads window.CRM_INITIAL_STATE and navigates to the appropriate route
 *
 * Supported parameters:
 * - view: 'customer_detail' | 'customers' | 'dashboard'
 * - id: 追客NO（trackingNo）for customer_detail view (例: M0024, 1234)
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
      // idはtrackingNo（追客NO）として扱う
      // 例: /customers/M0024
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

    // Clear initial state after consumption (but keep deploymentUrl for URL sharing)
    // deploymentUrlは他のコンポーネント（Breadcrumbs等）で使用するため保持
    const deploymentUrl = initialState.deploymentUrl;
    delete (window as any).CRM_INITIAL_STATE;

    // deploymentUrlだけを保持した新しいオブジェクトを設定
    if (deploymentUrl) {
      (window as any).CRM_INITIAL_STATE = { deploymentUrl };
    }
  }, [navigate]);

  return null; // This component doesn't render anything
};
