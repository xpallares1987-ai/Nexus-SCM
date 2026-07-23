import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 's':
            e.preventDefault();
            navigate('/shipments');
            break;
          case 'i':
            e.preventDefault();
            navigate('/inventory');
            break;
          case 'p':
            e.preventDefault();
            navigate('/directory');
            break;
          case 'r':
            e.preventDefault();
            navigate('/rates');
            break;
          case 'w':
            e.preventDefault();
            navigate('/warehouses');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const showShortcuts = () => {
    const modifier = navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl';
    toast.info(
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Keyboard Shortcuts</p>
        <ul className="space-y-1">
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+D</kbd> : Dashboard</li>
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+S</kbd> : Shipments</li>
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+I</kbd> : Inventory</li>
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+P</kbd> : Parties</li>
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+R</kbd> : Rates</li>
          <li><kbd className="bg-muted px-1 rounded border">{modifier}+W</kbd> : Warehouses</li>
        </ul>
      </div>,
      { duration: 5000 }
    );
  };

  return { showShortcuts };
}
