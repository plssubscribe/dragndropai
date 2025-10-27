# Drag & Drop PyTorch IDE

A React + TypeScript visual editor for assembling PyTorch models with real-time shape inference and code export.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Features

- Layer palette with drag-and-drop onto the canvas powered by React Flow.
- Schema-driven inspector for editing layer parameters with live validation.
- Shape engine that topologically sorts the graph and reports errors/warnings.
- Console that streams shape traces, validation issues, and a live PyTorch code preview.
- Code generator that emits a runnable `VisualNet` model plus a training stub.
- Local storage persistence, JSON import/export, and curated example graphs.
- Undo/redo, snap-to-grid canvas interactions, and automatic code export gating when invalid.

## Testing

```bash
npm test
```

The Vitest suite covers shape inference and code generation basics.
