import { Component } from 'react';

export default class RenderBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

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
