#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

// Fix node-pty spawn-helper permissions
// The spawn-helper binary needs execute permissions to work properly
// This is especially important for npx usage where permissions may not be preserved
const fixNodePtyPermissions = () => {
  try {
    // Find the node-pty package root using package.json for reliability
    const nodePtyPackageJson = require.resolve('node-pty/package.json');
    const nodePtyPath = path.dirname(nodePtyPackageJson);
    const prebuildsPath = path.join(nodePtyPath, 'prebuilds');
    
    if (!fs.existsSync(prebuildsPath)) {
      return;
    }
    
    const entries = fs.readdirSync(prebuildsPath, { withFileTypes: true });
    const platforms = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    
    for (const platform of platforms) {
      const platformPath = path.join(prebuildsPath, platform);
      const spawnHelperPath = path.join(platformPath, 'spawn-helper');
      
      if (fs.existsSync(spawnHelperPath)) {
        try {
          // Add execute permission (0o755 = rwxr-xr-x)
          fs.chmodSync(spawnHelperPath, 0o755);
        } catch (chmodErr) {
          // Silently continue if chmod fails (e.g., on Windows or insufficient permissions)
          // The error will be caught when attempting to spawn the terminal
        }
      }
    }
  } catch (err) {
    // Silently continue if we can't fix permissions
    // The error will be caught when attempting to spawn the terminal
  }
};

// Apply the fix on startup
fixNodePtyPermissions();

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

// Store terminal instances per socket
const terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

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

  socket.on('create-terminal', ({ cols, rows }) => {
    console.log('Creating terminal for socket:', socket.id);
    
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
      console.error('Shell attempted:', shell);
      console.error('Please ensure a compatible shell is installed on your system.');
      socket.emit('terminal-error', { 
        message: "Failed to create terminal. Please ensure a compatible shell (bash, sh, zsh) is installed on your system." 
      });
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
