import { Component } from 'react';

/**
 * Error boundary wrapper component for graceful error handling
 * @param {Object} props - Component props
 * @param {string} props.name - Identifier for this boundary
 * @param {ReactNode} props.children - Child components to wrap
 * @param {ReactNode} props.fallback - Fallback UI when error occurs
 */
class RenderBoundaryClass extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        const boundaryName = this.props.name || 'unnamed-boundary';
        console.error(`[Godseye] Render boundary tripped: ${boundaryName}`, error, info?.componentStack || '');
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

const RenderBoundary = RenderBoundaryClass;
export default RenderBoundary;