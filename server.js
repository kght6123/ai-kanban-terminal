#!/usr/bin/env node

const express = require('express');
const path = require('path');
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
const fs = require('fs');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory not found at:', distPath);
  console.error('This package may not have been built correctly.');
  console.error('If you installed via npx, please report this issue at:');
  console.error('https://github.com/kght6123/ai-kanban-terminal/issues');
  process.exit(1);
}

expressApp.use(express.static(distPath));

// Store terminal instances per socket
const terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-terminal', ({ cols, rows }) => {
    console.log('Creating terminal for socket:', socket.id);
    
    try {
      // Determine shell based on OS
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      
      // Create pseudo-terminal
      // NOTE: Uses HOME directory as working directory for development.
      // For production or sandboxed environments, consider using a specific
      // restricted directory: cwd: path.join(process.cwd(), 'workspace')
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env
      });

      // Store terminal instance
      terminals.set(socket.id, ptyProcess);

      // Send data from terminal to client
      ptyProcess.onData((data) => {
        socket.emit('terminal-output', data);
      });

      // Handle terminal exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal exited for ${socket.id}:`, exitCode, signal);
        terminals.delete(socket.id);
        socket.emit('terminal-exit', { exitCode, signal });
      });

      socket.emit('terminal-ready');
    } catch (err) {
      console.error('Failed to create terminal:', err);
      socket.emit('terminal-error', { message: "Failed to create terminal" });
    }
  });

  // Handle input from client
  socket.on('terminal-input', (data) => {
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.write(data);
    }
  });

  // Handle terminal resize
  socket.on('terminal-resize', ({ cols, rows }) => {
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.kill();
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
