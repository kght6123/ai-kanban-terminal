import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import './TerminalPane.css';
import type { PaneId, Direction } from './TiledLayout';

interface TerminalPaneProps {
  paneId: PaneId;
  onSplit: (paneId: PaneId, direction: Direction) => void;
  onClose: (paneId: PaneId) => void;
}

export default function TerminalPane({ paneId, onSplit, onClose }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

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

    // Connect to Socket.IO server
    const socket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected for pane:', paneId);
      setIsConnected(true);
      
      // Create terminal with current dimensions and pane ID
      socket.emit('create-terminal', {
        cols: xterm.cols,
        rows: xterm.rows,
        terminalId: paneId
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      xterm.writeln('\r\nConnection error. Retrying...');
    });

    socket.on('terminal-ready', (data: { terminalId: string }) => {
      if (data.terminalId === paneId) {
        xterm.writeln(`Terminal ${paneId} ready. Type commands below.`);
        xterm.writeln('');
      }
    });

    socket.on('terminal-output', (data: { terminalId: string; data: string }) => {
      if (data.terminalId === paneId) {
        xterm.write(data.data);
      }
    });

    socket.on('terminal-exit', (data: { terminalId: string; exitCode: number; signal?: number }) => {
      if (data.terminalId === paneId) {
        xterm.writeln(`\r\nTerminal exited with code ${data.exitCode}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected for pane:', paneId);
      setIsConnected(false);
      xterm.writeln('\r\n\r\nDisconnected from server');
    });

    // Handle user input
    xterm.onData((data) => {
      if (socket.connected) {
        socket.emit('terminal-input', { terminalId: paneId, data });
      }
    });

    // Handle window resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (fitAddonRef.current && socket.connected) {
          fitAddonRef.current.fit();
          socket.emit('terminal-resize', {
            terminalId: paneId,
            cols: xterm.cols,
            rows: xterm.rows
          });
        }
      }, 100);
    };

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current.parentElement) {
      resizeObserver.observe(terminalRef.current.parentElement);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      xterm.dispose();
      socket.emit('close-terminal', { terminalId: paneId });
      socket.disconnect();
    };
  }, [paneId]);

  const handleSplitHorizontal = () => {
    onSplit(paneId, 'horizontal');
  };

  const handleSplitVertical = () => {
    onSplit(paneId, 'vertical');
  };

  const handleClose = () => {
    onClose(paneId);
  };

  const handleFocus = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <div 
      className="terminal-pane"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className={`pane-controls ${showControls ? 'visible' : ''}`}>
        <div className="pane-info">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="pane-id">{paneId}</span>
        </div>
        <div className="pane-buttons">
          <button
            onClick={handleSplitHorizontal}
            title="Split horizontally"
            aria-label="Split horizontally"
          >
            ⬌
          </button>
          <button
            onClick={handleSplitVertical}
            title="Split vertically"
            aria-label="Split vertically"
          >
            ⬍
          </button>
          <button
            onClick={handleClose}
            title="Close terminal"
            aria-label="Close terminal"
            className="close-btn"
          >
            ✕
          </button>
        </div>
      </div>
      <div
        ref={terminalRef}
        className="terminal"
        role="region"
        aria-label={`Terminal ${paneId}`}
        tabIndex={0}
        onFocus={handleFocus}
      />
    </div>
  );
}
