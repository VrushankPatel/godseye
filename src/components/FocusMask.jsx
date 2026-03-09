import React from 'react';
import useStore from '../store/useStore';

export default function FocusMask() {
    const focusMode = useStore((s) => s.focusMode);
    return <div className={`focus-mask ${focusMode ? 'active' : ''}`} />;
}
