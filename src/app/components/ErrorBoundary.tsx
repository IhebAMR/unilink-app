"use client";
import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console for now — server-side logging can be added
    console.error('ErrorBoundary caught error:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 12, borderRadius: 8, background: '#fff7ed', color: '#92400e' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Map failed to load</div>
          <div style={{ marginBottom: 8, color: '#5b4231' }}>{String(this.state.error)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { this.reset(); }} style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', color: 'white', borderRadius: 6 }}>Try again</button>
            <button onClick={() => window.location.reload()} style={{ padding: '6px 10px', background: '#ef4444', border: 'none', color: 'white', borderRadius: 6 }}>Reload page</button>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}
