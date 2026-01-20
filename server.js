#!/usr/bin/env node

const express = require('express');
const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  // Store terminal instances per socket
  const terminals = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-terminal', ({ cols, rows }) => {
      console.log('Creating terminal for socket:', socket.id);
      
      // Determine shell based on OS
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      
      // Create pseudo-terminal
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

  // Handle all other requests with Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
