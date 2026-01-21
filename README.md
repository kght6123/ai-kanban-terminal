# AI Kanban Terminal

A browser-based terminal with bidirectional shell communication using Vite, Express, node-pty, xterm.js, and Socket.IO.

## Features

- 🖥️ **Browser-based Terminal**: Full terminal experience in your browser
- 🔄 **Bidirectional Communication**: Real-time shell input/output via Socket.IO
- 📐 **Responsive Resizing**: Automatic terminal resizing with Fit addon
- ♿ **WCAG 2.2 Compliant**: Accessible design with keyboard navigation, ARIA attributes, and high contrast support
- 🚀 **Quick Start**: Run with a single npx command

## Quick Start

### Using npx (Recommended)

Once published to npm:

```bash
npx ai-kanban-terminal
```

Or from GitHub directly:

```bash
npx github:kght6123/ai-kanban-terminal
```

### Local Development

#### Option 1: Production-like Mode (Recommended for npx)

1. Clone the repository:
```bash
git clone https://github.com/kght6123/ai-kanban-terminal.git
cd ai-kanban-terminal
```

2. Install dependencies:
```bash
npm install
```

3. The postinstall script automatically builds the frontend. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

#### Option 2: Development Mode (Frontend Development)

For frontend-only development with hot reload:

1. In one terminal, start the Vite dev server:
```bash
npm run dev
```

2. In another terminal, start the Express server:
```bash
npm start
```

3. Open your browser to `http://localhost:5173` (Vite dev server)

Note: In development mode, you'll need to manually connect Socket.IO to `http://localhost:3000` or update the component accordingly.

## Usage

Once the application starts, you'll see a terminal interface in your browser. You can:

- Type commands as you would in a regular terminal
- Use keyboard shortcuts (Ctrl+C, Ctrl+D, etc.)
- Resize the browser window to automatically adjust the terminal size
- Navigate with keyboard (Tab to focus on the terminal)

## Accessibility Features (WCAG 2.2)

- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Reader Support**: ARIA labels and roles for assistive technologies
- **High Contrast**: Minimum 4.5:1 contrast ratio for text
- **Reduced Motion**: Respects user's motion preferences
- **Focusable Terminal**: Terminal area is properly focusable and labeled

## Technology Stack

- **Vite**: Fast build tool and dev server
- **React**: UI library for the web application
- **Express**: HTTP server for serving static files
- **Socket.IO**: Real-time bidirectional communication
- **node-pty**: Pseudo terminal for spawning shells
- **xterm.js**: Terminal emulator in the browser
- **@xterm/addon-fit**: Automatic terminal resizing

## Scripts

- `npm run dev` - Start Vite development server on port 5173 (frontend only)
- `npm run build` - Build production bundle with Vite
- `npm start` - Start Express server on port 3000 (serves built files from dist/)
- `npm run preview` - Preview production build locally

## Publishing to npm

This package is configured for automatic deployment to npm. See [NPM_DEPLOY_GUIDE.md](NPM_DEPLOY_GUIDE.md) for detailed instructions in Japanese on:

- Setting up npm credentials
- Configuring GitHub Actions
- Creating releases
- Troubleshooting

### Quick Release Steps

1. Update version in `package.json`
2. Create a new release on GitHub with a tag (e.g., `v1.0.1`)
3. The GitHub Actions workflow will automatically build and publish to npm

## License

ISC