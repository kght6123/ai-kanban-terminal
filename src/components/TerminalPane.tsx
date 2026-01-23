import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';

// Import xterm.js CSS
import '@xterm/xterm/css/xterm.css';

interface TerminalPaneProps {
  socket: Socket;
  terminalId: string;
}

export default function TerminalPane({ socket, terminalId }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [srAnnouncement, setSrAnnouncement] = useState('');

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Initialize xterm.js
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      // WCAG2.2: Ensure sufficient contrast ratio (minimum 4.5:1)
      minimumContrastRatio: 4.5
    });

    // Initialize Fit addon
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // Open terminal in DOM
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Register event listeners for this specific terminal
    const handleTerminalReady = (data: { terminalId: string }) => {
      if (data.terminalId === terminalId) {
        xterm.writeln('Terminal ready. Type commands below.');
        xterm.writeln('');
        setIsReady(true);
        setSrAnnouncement('Terminal ready. Type commands below.');
      }
    };

    const handleTerminalOutput = (data: { terminalId: string; data: string }) => {
      if (data.terminalId === terminalId) {
        xterm.write(data.data);
      }
    };

    const handleTerminalExit = (data: { terminalId: string; exitCode: number; signal: number }) => {
      if (data.terminalId === terminalId) {
        xterm.writeln(`\r\nTerminal exited with code ${data.exitCode}, signal ${data.signal}`);
      }
    };

    socket.on('terminal-ready', handleTerminalReady);
    socket.on('terminal-output', handleTerminalOutput);
    socket.on('terminal-exit', handleTerminalExit);

    // Function to create terminal
    const createTerminal = () => {
      socket.emit('create-terminal', {
        terminalId,
        cols: xterm.cols,
        rows: xterm.rows
      });
    };

    // Create terminal with current dimensions
    if (socket.connected) {
      createTerminal();
    } else {
      // If not connected yet, wait for connection
      socket.once('connect', createTerminal);
    }

    // Handle user input
    xterm.onData((data) => {
      if (socket.connected) {
        socket.emit('terminal-input', { terminalId, data });
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && socket.connected) {
        fitAddonRef.current.fit();
        socket.emit('terminal-resize', {
          terminalId,
          cols: xterm.cols,
          rows: xterm.rows
        });
      }
    };

    // Initial fit after mount
    setTimeout(() => handleResize(), 100);

    // Use ResizeObserver for better resize detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      socket.off('terminal-ready', handleTerminalReady);
      socket.off('terminal-output', handleTerminalOutput);
      socket.off('terminal-exit', handleTerminalExit);
      socket.emit('close-terminal', { terminalId });
      xterm.dispose();
    };
  }, [socket, terminalId]);

  // WCAG2.2: Handle keyboard focus
  const handleFocus = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <div className="terminal-pane">
      {/* WCAG2.2: ARIA live region for screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>
      <div className="terminal-pane-header">
        <span className="terminal-id">Terminal {terminalId}</span>
        <span className={`terminal-status ${isReady ? 'ready' : 'loading'}`}>
          {isReady ? '●' : '○'}
        </span>
      </div>
      {/* WCAG2.2: Focusable terminal area with ARIA attributes */}
      <div
        ref={terminalRef}
        className="terminal-content"
        role="region"
        aria-label={`Interactive terminal ${terminalId}`}
        tabIndex={0}
        onFocus={handleFocus}
      />
    </div>
  );
}
