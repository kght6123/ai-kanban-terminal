#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: {
    // NOTE: Wildcard origin is used for development convenience.
    // For production, replace with specific allowed origins:
    // origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://yourdomain.com'
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from dist directory
const distPath = path.join(__dirname, 'dist');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory not found at:', distPath);
  console.error('This package may not have been built correctly.');
  console.error('If you installed via npx, please report this issue at:');
  console.error('https://github.com/kght6123/ai-kanban-terminal/issues');
  process.exit(1);
}

expressApp.use(express.static(distPath));

// Store terminal instances: Map<socketId, Map<terminalId, ptyProcess>>
const terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  terminals.set(socket.id, new Map());

  socket.on('create-terminal', ({ terminalId, cols, rows }) => {
    console.log(`Creating terminal ${terminalId} for socket:`, socket.id);

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env
      });

      terminals.get(socket.id).set(terminalId, ptyProcess);

      ptyProcess.onData((data) => {
        socket.emit('terminal-output', { terminalId, data });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal ${terminalId} exited for ${socket.id}:`, exitCode, signal);
        terminals.get(socket.id)?.delete(terminalId);
        socket.emit('terminal-exit', { terminalId, exitCode, signal });
      });

      socket.emit('terminal-ready', { terminalId });
    } catch (err) {
      console.error(`Failed to create terminal ${terminalId}:`, err);
      socket.emit('terminal-error', {
        terminalId,
        message: 'Failed to create terminal. Please ensure a compatible shell (bash, sh, zsh) is installed on your system.'
      });
    }
  });

  socket.on('terminal-input', ({ terminalId, data }) => {
    terminals.get(socket.id)?.get(terminalId)?.write(data);
  });

  socket.on('terminal-resize', ({ terminalId, cols, rows }) => {
    terminals.get(socket.id)?.get(terminalId)?.resize(cols, rows);
  });

  socket.on('close-terminal', ({ terminalId }) => {
    const ptyProcess = terminals.get(socket.id)?.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.get(socket.id).delete(terminalId);
      console.log(`Terminal ${terminalId} closed for socket:`, socket.id);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const socketTerminals = terminals.get(socket.id);
    if (socketTerminals) {
      socketTerminals.forEach((ptyProcess) => ptyProcess.kill());
      terminals.delete(socket.id);
    }
  });
});

// Fallback to serve index.html for client-side routing
expressApp.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Failed to serve index.html:', err);
      res.status(500).send("Build artifacts (dist/index.html) not found. Please run 'npm run build' first.");
    }
  });
});

httpServer.listen(port, () => {
  console.log(`\n✓ ai-kanban-terminal is ready!`);
  console.log(`\n  Open your browser and navigate to:\n`);
  console.log(`  \x1b[1m\x1b[36mhttp://${hostname}:${port}\x1b[0m\n`);
  console.log(`  Press Ctrl+C to stop the server\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${port} is already in use.`);
    console.error(`Please try a different port by setting the PORT environment variable:`);
    console.error(`  PORT=3001 npx ai-kanban-terminal\n`);
  } else {
    console.error('Server failed to start:', err);
  }
  process.exit(1);
});
