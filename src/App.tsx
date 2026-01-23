import { useState, useEffect } from 'react';
import { 
  Mosaic, 
  MosaicWindow, 
  MosaicNode,
  MosaicBranch,
  MosaicWindowContext,
  createBalancedTreeFromLeaves
} from 'react-mosaic-component';
import { io, Socket } from 'socket.io-client';
import TerminalPane from './components/TerminalPane';

// Import react-mosaic CSS
import 'react-mosaic-component/react-mosaic-component.css';

type ViewId = string;

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentNode, setCurrentNode] = useState<MosaicNode<ViewId> | null>('terminal-1');
  const [terminalCounter, setTerminalCounter] = useState(1);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createNode = () => {
    const newCounter = terminalCounter + 1;
    setTerminalCounter(newCounter);
    return `terminal-${newCounter}`;
  };

  const renderTile = (id: ViewId, path: MosaicBranch[]) => {
    if (!socket) return null;
    
    return (
      <MosaicWindow<ViewId>
        path={path}
        title={`Terminal ${id}`}
        createNode={createNode}
      >
        <div style={{ height: '100%', width: '100%' }}>
          <TerminalPane socket={socket} terminalId={id} />
        </div>
      </MosaicWindow>
    );
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>AI Kanban Terminal</h1>
        <div className="connection-status">
          <span 
            className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            aria-label={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      <div className="mosaic-container">
        {currentNode && (
          <Mosaic<ViewId>
            renderTile={renderTile}
            value={currentNode}
            onChange={setCurrentNode}
            className="mosaic-blueprint-theme"
          />
        )}
      </div>
    </div>
  );
}
