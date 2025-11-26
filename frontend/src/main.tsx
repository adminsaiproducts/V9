import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log("🚀 SCRIPT LOADED: JS is running!");

// Debug logger to show messages on screen
declare global {
  interface Window {
    addLog: (msg: string) => void;
  }
}

const createDebugConsole = () => {
  const consoleDiv = document.createElement('div');
  consoleDiv.id = 'debug-console';
  consoleDiv.style.position = 'fixed';
  consoleDiv.style.bottom = '0';
  consoleDiv.style.left = '0';
  consoleDiv.style.width = '100%';
  consoleDiv.style.height = '150px';
  consoleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  consoleDiv.style.color = 'lime';
  consoleDiv.style.fontFamily = 'monospace';
  consoleDiv.style.fontSize = '12px';
  consoleDiv.style.overflowY = 'scroll';
  consoleDiv.style.padding = '10px';
  consoleDiv.style.zIndex = '9999';
  consoleDiv.style.pointerEvents = 'none'; // Click through
  document.body.appendChild(consoleDiv);
  return consoleDiv;
};

let debugConsole: HTMLElement | null = null;

window.addLog = (msg: string) => {
  if (!debugConsole) {
    debugConsole = createDebugConsole();
  }
  const logLine = document.createElement('div');
  logLine.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugConsole.appendChild(logLine);
  debugConsole.scrollTop = debugConsole.scrollHeight;
  console.log(msg);
};

const logToScreen = window.addLog;

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logToScreen(`ErrorBoundary caught: ${error.message}`);
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const mount = () => {
  logToScreen('Mounting started...');
  const root = document.getElementById('root');
  if (root) {
    try {
      createRoot(root).render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>,
      );
      logToScreen('Render called.');
    } catch (e: any) {
      logToScreen(`Mount error: ${e.message}`);
    }
  } else {
    logToScreen('Root element not found');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
