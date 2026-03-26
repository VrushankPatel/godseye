import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RenderBoundary from './components/RenderBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RenderBoundary name="app-root">
            <App />
        </RenderBoundary>
    </React.StrictMode>
);
