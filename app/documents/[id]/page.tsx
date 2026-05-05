"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocument, updateDocument } from "@/lib/api/documents";
import { useDebounce } from "@/app/hooks/useDebounce";
import { getSocket } from "@/lib/socket";

interface DocumentData {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}
interface PresenceUser {
  socketId: string;
  email: string;
}

export default function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const debouncedTitle = useDebounce(title, 800);
  const debouncedContent = useDebounce(content, 800);

  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isRemoteUpdating, setIsRemoteUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const doc = await getDocument(params.id);

        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setIsInitialLoaded(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load document.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  useEffect(() => {
    if (!document || !isInitialLoaded) return;
    if (isRemoteUpdating) return;

    const hasChanged =
      debouncedTitle !== document.title ||
      debouncedContent !== document.content;

    if (!hasChanged) return;

    async function autosave() {
      if (!document) return;

      setSaveStatus("saving");

      try {
        const updatedDoc = await updateDocument(document.id, {
          title: debouncedTitle,
          content: debouncedContent,
        });

        setDocument(updatedDoc);
        setSaveStatus("saved");

        setTimeout(() => {
          setSaveStatus("idle");
        }, 1500);
      } catch {
        setSaveStatus("error");
      }
    }

    autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedContent, document, isInitialLoaded]);

  useEffect(() => {
    if (!document) return;

    const socket = getSocket();

    socket.emit("join-document", {
      documentId: document.id,
      user: {
        email: "You",
      },
    });

    socket.on("presence-update", (users: PresenceUser[]) => {
      setOnlineUsers(users);
    });

    socket.on(
      "receive-document-change",
      (payload: { title: string; content: string }) => {
        setIsRemoteUpdating(true);
        setTitle(payload.title);
        setContent(payload.content);

        setTimeout(() => {
          setIsRemoteUpdating(false);
        }, 0);
      },
    );

    return () => {
      socket.off("presence-update");
      socket.off("receive-document-change");
    };
  }, [document]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        Loading document...
      </main>
    );
  }

  if (error && !document) {
    return (
      <main className="min-h-screen bg-slate-950 text-red-400 p-8">
        {error}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => router.push("/documents")}
            className="text-sm text-slate-400 hover:text-sky-400 cursor-pointer"
          >
            ← Back
          </button>

          <div className="flex gap-4">
            <div className="flex items-center gap-3 text-sm">
              {saveStatus === "saving" && (
                <span className="text-yellow-400">Saving...</span>
              )}

              {saveStatus === "saved" && (
                <span className="text-green-400">Saved</span>
              )}

              {saveStatus === "error" && (
                <span className="text-red-400">Save failed</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onlineUsers.map((user) => (
                <div
                  key={user.socketId}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white"
                  title={user.email}
                >
                  {user.email.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <input
          value={title}
          onChange={(e) => {
            const nextTitle = e.target.value;

            setTitle(nextTitle);
            setSaveStatus("idle");

            if (document) {
              getSocket().emit("document-change", {
                documentId: document.id,
                title: nextTitle,
                content,
              });
            }
          }}
          className="w-full bg-transparent text-4xl font-bold outline-none placeholder:text-slate-600"
          placeholder="Untitled Document"
        />

        <textarea
          value={content}
          onChange={(e) => {
            const nextContent = e.target.value;

            setContent(nextContent);
            setSaveStatus("idle");

            if (document) {
              getSocket().emit("document-change", {
                documentId: document.id,
                title,
                content: nextContent,
              });
            }
          }}
          placeholder="Start writing..."
          className="mt-8 min-h-[600px] w-full resize-none bg-transparent text-lg leading-8 text-slate-200 outline-none placeholder:text-slate-600"
        />

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </section>
    </main>
  );
}
