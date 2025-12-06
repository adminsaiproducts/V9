import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// マウント処理
console.log('🔥 JS ENTRY POINT EXECUTED');

function mountApp() {
  console.log('🚀 Starting Mount Process...');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    return;
  }

  try {
    console.log('✅ Creating React root...');
    const reactRoot = createRoot(rootElement);
    reactRoot.render(<App />);
    console.log('✅ React render called successfully');
  } catch (e: any) {
    console.error('❌ React mount error:', e);
    rootElement.innerHTML = '<div style="color:red; padding:20px;"><h3>React Mount Error</h3><p>' + e.message + '</p></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
