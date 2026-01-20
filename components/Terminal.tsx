'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';

// Import xterm.js CSS
import '@xterm/xterm/css/xterm.css';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [srAnnouncement, setSrAnnouncement] = useState('');

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

    // Connect to Socket.IO server
    const socket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      setSrAnnouncement('Connected to terminal server');
      
      // Create terminal with current dimensions
      socket.emit('create-terminal', {
        cols: xterm.cols,
        rows: xterm.rows
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      xterm.writeln('\r\nConnection error. Retrying...');
      setSrAnnouncement('Connection error. Retrying...');
    });

    socket.on('reconnect_failed', () => {
      xterm.writeln('\r\nFailed to reconnect to server');
      setSrAnnouncement('Failed to reconnect to server');
    });

    socket.on('terminal-ready', () => {
      xterm.writeln('Terminal ready. Type commands below.');
      xterm.writeln('');
      // WCAG2.2: Announce to screen readers
      setSrAnnouncement('Terminal ready. Type commands below.');
    });

    socket.on('terminal-output', (data: string) => {
      xterm.write(data);
    });

    socket.on('terminal-exit', ({ exitCode, signal }) => {
      xterm.writeln(`\r\nTerminal exited with code ${exitCode}, signal ${signal}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
      xterm.writeln('\r\n\r\nDisconnected from server');
      setSrAnnouncement('Disconnected from server');
    });

    // Handle user input
    xterm.onData((data) => {
      if (socket.connected) {
        socket.emit('terminal-input', data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && socket.connected) {
        fitAddonRef.current.fit();
        socket.emit('terminal-resize', {
          cols: xterm.cols,
          rows: xterm.rows
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
      socket.disconnect();
    };
  }, []);

  // WCAG2.2: Handle keyboard focus
  const handleFocus = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <div className="terminal-container">
      {/* WCAG2.2: ARIA live region for screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>
      <div className="terminal-header">
        <h1>AI Kanban Terminal</h1>
        <div className="connection-status">
          <span 
            className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            aria-label={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      {/* WCAG2.2: Focusable terminal area with ARIA attributes */}
      <div
        ref={terminalRef}
        className="terminal"
        role="region"
        aria-label="Interactive terminal"
        tabIndex={0}
        onFocus={handleFocus}
      />
    </div>
  );
}
