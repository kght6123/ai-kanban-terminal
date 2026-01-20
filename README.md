# AI Kanban Terminal

A browser-based terminal with bidirectional shell communication using Next.js, node-pty, xterm.js, and Socket.IO.

## Features

- 🖥️ **Browser-based Terminal**: Full terminal experience in your browser
- 🔄 **Bidirectional Communication**: Real-time shell input/output via Socket.IO
- 📐 **Responsive Resizing**: Automatic terminal resizing with Fit addon
- ♿ **WCAG 2.2 Compliant**: Accessible design with keyboard navigation, ARIA attributes, and high contrast support
- 🚀 **Quick Start**: Run with a single npx command

## Quick Start

### Using npx (Recommended)

```bash
npx github:kght6123/ai-kanban-terminal
```

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/kght6123/ai-kanban-terminal.git
cd ai-kanban-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

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

- **Next.js**: React framework for the web application
- **Express**: Custom server for HTTP requests
- **Socket.IO**: Real-time bidirectional communication
- **node-pty**: Pseudo terminal for spawning shells
- **xterm.js**: Terminal emulator in the browser
- **@xterm/addon-fit**: Automatic terminal resizing

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## License

ISC