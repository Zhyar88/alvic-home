import React from 'react';
import logoUrl from '../../assets/logo.png';

export function TitleBar() {
  if (!(window as any).electronAPI) return null;

  const handleMinimize = () => (window as any).electronAPI.minimize();
  const handleMaximize = () => (window as any).electronAPI.maximize();
  const handleClose = () => (window as any).electronAPI.close();
  const handleReload = () => (window as any).electronAPI.reload();

  return (
    <div
      style={{ WebkitAppRegion: 'drag', height: '38px' } as React.CSSProperties}
      className="flex items-center justify-between bg-emerald-900 text-white select-none flex-shrink-0"
    >
      {/* Left — Logo and title */}
      <div className="flex items-center gap-2 px-3">
        <img src={logoUrl} alt="logo" style={{ height: '20px', width: 'auto' }} />
        <span className="text-sm font-semibold text-emerald-100">Alvic Home</span>
      </div>

      {/* Right — Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Refresh */}
        <button
          onClick={handleReload}
          title="Refresh"
          className="flex items-center justify-center w-10 h-full hover:bg-emerald-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="flex items-center justify-center w-10 h-full hover:bg-emerald-700 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          title="Maximize"
          className="flex items-center justify-center w-10 h-full hover:bg-emerald-700 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="1"/>
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          title="Close"
          className="flex items-center justify-center w-10 h-full hover:bg-red-600 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}