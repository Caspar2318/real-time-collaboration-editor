import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const documentUsers = new Map<string, any[]>();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-document", ({ documentId, user }) => {
      socket.join(documentId);

      socket.data.documentId = documentId;
      socket.data.user = user;

      if (!documentUsers.has(documentId)) {
        documentUsers.set(documentId, []);
      }

      const users = documentUsers.get(documentId)!;

      if (!users.find((u) => u.socketId === socket.id)) {
        users.push({
          socketId: socket.id,
          email: user.email,
        });
      }

      io.to(documentId).emit("presence-update", users);
    });

    socket.on("document-change", ({ documentId, title, content }) => {
      socket.to(documentId).emit("receive-document-change", {
        title,
        content,
      });
    });

    socket.on("disconnect", () => {
      const documentId = socket.data.documentId;

      if (!documentId) return;

      const users = documentUsers.get(documentId) || [];

      const nextUsers = users.filter((u) => u.socketId !== socket.id);

      documentUsers.set(documentId, nextUsers);

      io.to(documentId).emit("presence-update", nextUsers);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});
