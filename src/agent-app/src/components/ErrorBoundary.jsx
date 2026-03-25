import React from 'react';

/**
 * Error Boundary component for React.
 * Catches JavaScript errors in child components and displays a fallback UI.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            errorInfo
        });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            const errorMessage = this.state.error?.message || 'Unknown error';
            const componentName = this.props.name || 'Component';

            return (
                <div style={{
                    padding: '20px',
                    margin: '20px',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b'
                }}>
                    <h2 style={{ marginTop: 0 }}>
                        <span style={{ marginRight: '8px' }}>⚠️</span>
                        {componentName} 出错了
                    </h2>
                    <p style={{ fontSize: '14px' }}>
                        <strong>错误信息:</strong> {errorMessage}
                    </p>
                    {this.state.errorInfo && (
                        <details style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                详细信息
                            </summary>
                            <pre style={{
                                fontSize: '12px',
                                backgroundColor: '#fee2e2',
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '200px'
                            }}>
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            重试
                        </button>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            刷新页面
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
