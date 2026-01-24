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

// Store terminal instances by socket and terminal ID
const terminals = new Map(); // Map<socketId, Map<terminalId, ptyProcess>>

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Initialize terminal map for this socket
  terminals.set(socket.id, new Map());

  // Helper function to find an available shell
  const findAvailableShell = () => {
    if (os.platform() === 'win32') {
      // Windows: Try common shells
      const windowsShells = [
        process.env.COMSPEC,
        'C:\\Windows\\System32\\cmd.exe',
        'cmd.exe',
        'powershell.exe'
      ];
      
      for (const shell of windowsShells) {
        if (shell && fs.existsSync(shell)) {
          return shell;
        }
      }
      // If no shell found, try cmd.exe without path (let OS find it)
      return 'cmd.exe';
    } else {
      // Unix-like systems: Try to find an available shell
      const unixShells = [
        process.env.SHELL,
        '/bin/bash',
        '/usr/bin/bash',
        '/bin/sh',
        '/usr/bin/sh',
        '/bin/zsh',
        '/usr/bin/zsh'
      ];
      
      for (const shell of unixShells) {
        if (shell && fs.existsSync(shell)) {
          return shell;
        }
      }
      
      // If no shell found, try /bin/sh anyway (most minimal fallback)
      // This will fail with a clear error if it doesn't exist
      return '/bin/sh';
    }
  };

  socket.on('create-terminal', ({ cols, rows, terminalId }) => {
    console.log('Creating terminal:', terminalId, 'for socket:', socket.id);
    
    const socketTerminals = terminals.get(socket.id);
    if (!socketTerminals) {
      console.error('Socket terminals map not found for:', socket.id);
      socket.emit('terminal-error', { 
        terminalId,
        message: "Failed to create terminal. Socket not properly initialized." 
      });
      return;
    }
    
    // Determine shell based on OS
    const shell = findAvailableShell();
    
    try {
      console.log('Using shell:', shell);
      
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
      socketTerminals.set(terminalId, ptyProcess);

      // Send data from terminal to client
      ptyProcess.onData((data) => {
        socket.emit('terminal-output', { terminalId, data });
      });

      // Handle terminal exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal ${terminalId} exited for ${socket.id}:`, exitCode, signal);
        socketTerminals.delete(terminalId);
        socket.emit('terminal-exit', { terminalId, exitCode, signal });
      });

      socket.emit('terminal-ready', { terminalId });
    } catch (err) {
      console.error('Failed to create terminal:', err);
      console.error('Shell attempted:', shell);
      console.error('Please ensure a compatible shell is installed on your system.');
      socket.emit('terminal-error', { 
        terminalId,
        message: "Failed to create terminal. Please ensure a compatible shell (bash, sh, zsh) is installed on your system." 
      });
    }
  });

  // Handle input from client
  socket.on('terminal-input', ({ terminalId, data }) => {
    const socketTerminals = terminals.get(socket.id);
    if (!socketTerminals) return;
    
    const terminal = socketTerminals.get(terminalId);
    if (terminal) {
      terminal.write(data);
    }
  });

  // Handle terminal resize
  socket.on('terminal-resize', ({ terminalId, cols, rows }) => {
    const socketTerminals = terminals.get(socket.id);
    if (!socketTerminals) return;
    
    const terminal = socketTerminals.get(terminalId);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  });

  // Handle terminal close
  socket.on('close-terminal', ({ terminalId }) => {
    const socketTerminals = terminals.get(socket.id);
    if (!socketTerminals) return;
    
    const terminal = socketTerminals.get(terminalId);
    if (terminal) {
      console.log('Closing terminal:', terminalId, 'for socket:', socket.id);
      terminal.kill();
      socketTerminals.delete(terminalId);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const socketTerminals = terminals.get(socket.id);
    if (socketTerminals) {
      // Kill all terminals for this socket
      for (const [terminalId, terminal] of socketTerminals.entries()) {
        console.log('Killing terminal:', terminalId);
        terminal.kill();
      }
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
