import TiledLayout from './components/TiledLayout';

export default function App() {
  return (
    <main>
      <div className="app-header">
        <h1>AI Kanban Terminal</h1>
        <div className="app-info">
          Phase 2: Window Management (Tiling)
        </div>
      </div>
      <div className="app-content">
        <TiledLayout />
      </div>
    </main>
  );
}
