import { useState, useCallback } from 'react';
import TerminalPane from './TerminalPane';
import './TiledLayout.css';

export type PaneId = string;
export type Direction = 'horizontal' | 'vertical';

export interface Pane {
  id: PaneId;
  type: 'terminal';
}

export interface Split {
  id: PaneId;
  direction: Direction;
  children: (Pane | Split)[];
  sizes: number[]; // Percentage sizes for each child
}

export type Layout = Pane | Split;

let paneIdCounter = 0;

function generatePaneId(): PaneId {
  return `pane-${++paneIdCounter}`;
}

function isSplit(node: Layout): node is Split {
  return 'children' in node;
}

export default function TiledLayout() {
  // Initial state: single terminal pane
  const [layout, setLayout] = useState<Layout>({
    id: generatePaneId(),
    type: 'terminal'
  });

  // Split a pane in the given direction
  const splitPane = useCallback((paneId: PaneId, direction: Direction) => {
    setLayout((prevLayout) => {
      const newLayout = structuredClone(prevLayout) as Layout;
      
      function findAndSplit(node: Layout): boolean {
        if (!isSplit(node)) {
          if (node.id === paneId) {
            // Can't modify node directly since it's not a Split
            return true;
          }
          return false;
        }

        // Check if any child matches
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (!isSplit(child) && child.id === paneId) {
            // Replace this child with a split containing the old pane and a new one
            const newPaneId = generatePaneId();
            const newSplit: Split = {
              id: generatePaneId(),
              direction,
              children: [
                child,
                { id: newPaneId, type: 'terminal' }
              ],
              sizes: [50, 50]
            };
            node.children[i] = newSplit;
            return true;
          } else if (findAndSplit(child)) {
            return true;
          }
        }
        return false;
      }

      // Special case: if root is a pane and we're splitting it
      if (!isSplit(newLayout) && newLayout.id === paneId) {
        const newPaneId = generatePaneId();
        return {
          id: generatePaneId(),
          direction,
          children: [
            newLayout,
            { id: newPaneId, type: 'terminal' }
          ],
          sizes: [50, 50]
        };
      }

      findAndSplit(newLayout);
      return newLayout;
    });
  }, []);

  // Close a pane
  const closePane = useCallback((paneId: PaneId) => {
    setLayout((prevLayout) => {
      const newLayout = structuredClone(prevLayout) as Layout;

      function findAndRemove(node: Layout, parent?: Split, indexInParent?: number): Layout | null {
        if (!isSplit(node)) {
          return node.id === paneId ? null : node;
        }

        // Process children
        const newChildren: (Pane | Split)[] = [];
        for (const child of node.children) {
          const result = findAndRemove(child, node);
          if (result !== null) {
            newChildren.push(result);
          }
        }

        // If we have no children left, this split should be removed
        if (newChildren.length === 0) {
          return null;
        }

        // If we have only one child, collapse this split
        if (newChildren.length === 1) {
          return newChildren[0];
        }

        // Update sizes to maintain proportions
        const totalSize = node.sizes.reduce((a, b) => a + b, 0);
        const avgSize = totalSize / newChildren.length;
        
        return {
          ...node,
          children: newChildren,
          sizes: newChildren.map(() => avgSize)
        };
      }

      // Don't allow closing the last pane
      if (!isSplit(newLayout)) {
        return prevLayout;
      }

      const result = findAndRemove(newLayout);
      return result || prevLayout;
    });
  }, []);

  // Render the layout recursively
  const renderLayout = useCallback((node: Layout, depth: number = 0): JSX.Element => {
    if (!isSplit(node)) {
      return (
        <TerminalPane
          key={node.id}
          paneId={node.id}
          onSplit={splitPane}
          onClose={closePane}
        />
      );
    }

    const gridStyle = node.direction === 'horizontal'
      ? {
          display: 'grid',
          gridTemplateColumns: node.sizes.map(s => `${s}fr`).join(' '),
          gridTemplateRows: '1fr',
          height: '100%',
          width: '100%',
          gap: '1px',
          backgroundColor: '#3e3e42'
        }
      : {
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: node.sizes.map(s => `${s}fr`).join(' '),
          height: '100%',
          width: '100%',
          gap: '1px',
          backgroundColor: '#3e3e42'
        };

    return (
      <div key={node.id} style={gridStyle}>
        {node.children.map((child) => renderLayout(child, depth + 1))}
      </div>
    );
  }, [splitPane, closePane]);

  return (
    <div className="tiled-layout">
      {renderLayout(layout)}
    </div>
  );
}
