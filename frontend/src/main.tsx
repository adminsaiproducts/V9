import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

interface Customer {
  id: string;
  name: string;
  kana: string;
  address: string;
  phone: string;
  email: string;
}

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 Fetching customers...');

    // GAS環境チェック
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      console.error('❌ google.script.run is not available');
      setError('GAS環境が検出できません');
      setLoading(false);
      return;
    }

    // GAS APIコール
    google.script.run
      .withSuccessHandler((result: string) => {
        console.log('✅ API Response:', result);
        try {
          const data = JSON.parse(result);
          if (data.status === 'success') {
            setCustomers(data.data);
          } else {
            setError('データ取得に失敗しました');
          }
        } catch (e) {
          console.error('❌ Parse error:', e);
          setError('レスポンスのパースに失敗しました');
        }
        setLoading(false);
      })
      .withFailureHandler((err: Error) => {
        console.error('❌ API Error:', err);
        setError(err.message);
        setLoading(false);
      })
      .api_getCustomers();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>CRM V9 - 顧客リスト</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>CRM V9 - 顧客リスト</h1>
        <p style={{ color: 'red' }}>エラー: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>CRM V9 - 顧客リスト</h1>
      <p>顧客数: {customers.length}件</p>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>名前</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>カナ</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>住所</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>電話</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>メール</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.kana}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.address}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.phone}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
