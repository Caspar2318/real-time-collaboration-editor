# Real-time Collaboration Editor

A real-time collaborative editor inspired by Notion and Google Docs.

Users can create documents, invite collaborators, and edit together in real time.

Built mainly to practice realtime systems and collaborative product architecture.

---

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma 7
- PostgreSQL (Neon)
- Socket.io
- Tiptap
- Tailwind CSS

---

## Features

- User authentication
- Create and edit documents
- Rich text editor
- Autosave with debounce
- Realtime collaboration
- Online user presence
- Typing indicator
- Cursor position tracking
- Invite collaborators by email
- Shared document permissions
- Basic conflict handling

---

## Local Setup

Install dependencies:

```bash
npm install
```

Setup environment variables:

```env
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

Run Prisma:

```bash
npx prisma generate
npx prisma db push
```

Start development server:

```bash
npm run dev
```

---

## Notes

This project uses a custom Socket.io server, so Railway or Render is recommended for deployment instead of Vercel.

---

## Future Improvements

- Better realtime cursor overlay
- CRDT / OT support
- Workspace & folders
- Version history
- Comments system
- Notifications

---

## Why I Built This

I wanted to build something beyond a typical CRUD project and learn how realtime collaborative systems work.

This project helped me practice:

- WebSocket communication
- Presence systems
- State synchronization
- Conflict handling
- Full-stack TypeScript architecture
