import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import TerminalPane from './components/TerminalPane';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [paneIds, setPaneIds] = useState<string[]>(['pane-1']);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const s = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  const addPane = () => {
    nextIdRef.current += 1;
    setPaneIds((prev) => [...prev, `pane-${nextIdRef.current}`]);
  };

  const removePane = (id: string) => {
    setPaneIds((prev) => prev.filter((p) => p !== id));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Kanban Terminal</h1>
        <div className="header-controls">
          <button className="add-terminal-btn" onClick={addPane} aria-label="Add terminal">
            + Add Terminal
          </button>
          <div className="connection-status">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
              aria-label={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>
      {/* WCAG2.2: ARIA live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isConnected ? 'Connected to terminal server' : 'Disconnected from terminal server'}
      </div>
      <main className="terminal-grid">
        {socket &&
          paneIds.map((id) => (
            <TerminalPane
              key={id}
              paneId={id}
              socket={socket}
              onClose={paneIds.length > 1 ? () => removePane(id) : undefined}
            />
          ))}
      </main>
    </div>
  );
}
