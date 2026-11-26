import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface Props {
  paneId: string;
  socket: Socket;
  onClose?: () => void;
}

export default function TerminalPane({ paneId, socket, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
        brightWhite: '#e5e5e5',
      },
      minimumContrastRatio: 4.5,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();

    // Create terminal on server (also handles reconnection)
    const createTerminal = () => {
      socket.emit('create-terminal', { terminalId: paneId, cols: xterm.cols, rows: xterm.rows });
    };

    if (socket.connected) {
      createTerminal();
    }
    socket.on('connect', createTerminal);

    const onOutput = ({ terminalId, data }: { terminalId: string; data: string }) => {
      if (terminalId === paneId) xterm.write(data);
    };
    const onReady = ({ terminalId }: { terminalId: string }) => {
      if (terminalId === paneId) xterm.writeln('Terminal ready.');
    };
    const onExit = ({ terminalId, exitCode }: { terminalId: string; exitCode: number }) => {
      if (terminalId === paneId) xterm.writeln(`\r\nProcess exited (${exitCode})`);
    };

    socket.on('terminal-output', onOutput);
    socket.on('terminal-ready', onReady);
    socket.on('terminal-exit', onExit);

    xterm.onData((data) => {
      if (socket.connected) {
        socket.emit('terminal-input', { terminalId: paneId, data });
      }
    });

    // Resize observer for responsive layout changes
    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitAddon.fit();
        socket.emit('terminal-resize', { terminalId: paneId, cols: xterm.cols, rows: xterm.rows });
      }, 50);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      socket.off('connect', createTerminal);
      socket.off('terminal-output', onOutput);
      socket.off('terminal-ready', onReady);
      socket.off('terminal-exit', onExit);
      socket.emit('close-terminal', { terminalId: paneId });
      xterm.dispose();
    };
  }, [paneId, socket]);

  return (
    <div className="terminal-pane" role="region" aria-label={`Terminal ${paneId}`}>
      <div className="pane-header">
        <span className="pane-id">{paneId}</span>
        {onClose && (
          <button
            className="pane-close"
            onClick={onClose}
            aria-label={`Close terminal ${paneId}`}
          >
            ×
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="pane-terminal"
        tabIndex={0}
        aria-label={`Terminal input area for ${paneId}`}
      />
    </div>
  );
}
