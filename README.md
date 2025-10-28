# Linkhub Dashboard

A lightweight, dependency-free dashboard for curating a shareable personal link page in the style of Linktree. Update your profile, theme, and link list from a single screen while a live preview mirrors the shared experience.

## Previewing locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser. The terminal must remain open while you are previewing. Alternatively, `npm start` and `npm run preview` are aliases for the same static server.

## Available scripts

- `npm run dev` / `npm start` / `npm run preview` – serve the static dashboard for local development
- `npm test` – smoke-check that the required static assets exist

## Key features

- Inline editing for profile name, handle, bio, and avatar URL with instant preview updates
- Theme picker with multiple curated gradients and accent colors
- Add, edit, disable, and reorder unlimited links with keyboard-friendly controls
- Mobile-focused preview layout that mirrors the public share page, including copy-link CTA
- Zero external build tooling for quick installs and predictable previews
