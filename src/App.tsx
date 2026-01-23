import { useState, useEffect } from 'react';
import { 
  Mosaic, 
  MosaicWindow, 
  MosaicNode,
  MosaicBranch,
  MosaicWindowContext
} from 'react-mosaic-component';
import { io, Socket } from 'socket.io-client';
import TerminalPane from './components/TerminalPane';

// Import react-mosaic CSS
import 'react-mosaic-component/react-mosaic-component.css';

type ViewId = string;

// Custom toolbar controls for split buttons
const ToolbarControls = ({ mosaicWindowActions }: { mosaicWindowActions: any }) => {
  return (
    <div className="mosaic-controls">
      <button
        className="mosaic-control-button"
        title="Split Horizontally"
        onClick={() => mosaicWindowActions.split()}
      >
        ⬌
      </button>
      <button
        className="mosaic-control-button"
        title="Split Vertically"
        onClick={() => mosaicWindowActions.split()}
      >
        ⬍
      </button>
    </div>
  );
};

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
        renderToolbar={(props) => (
          <MosaicWindowContext.Consumer>
            {({ mosaicWindowActions }) => (
              <div className="mosaic-window-toolbar">
                <div className="mosaic-window-title">{props?.title}</div>
                <div className="mosaic-window-controls">
                  <ToolbarControls mosaicWindowActions={mosaicWindowActions} />
                </div>
              </div>
            )}
          </MosaicWindowContext.Consumer>
        )}
      >
        <TerminalPane socket={socket} terminalId={id} />
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
