"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocument, updateDocument } from "@/lib/api/documents";
import { useDebounce } from "@/app/hooks/useDebounce";
import { getSocket } from "@/lib/socket";
import { getCurrentUser, CurrentUser } from "@/lib/api/user";
import { RichTextEditor } from "@/app/components/RichTextEditor";

interface Collaborator {
  id: string;
  userId: string;
  documentId: string;
  user: {
    id: string;
    email: string;
  };
}

interface DocumentData {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  isOwner: boolean;
  updatedAt: string;
  collaborators: Collaborator[];
}

interface PresenceUser {
  socketId: string;
  id: string;
  email: string;
}

interface RemoteCursor {
  userId: string;
  email: string;
  position: number;
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

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
          updatedAt: document.updatedAt,
        });

        setDocument(updatedDoc);
        setSaveStatus("saved");

        setTimeout(() => {
          setSaveStatus("idle");
        }, 1500);
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "type" in err &&
          err.type === "conflict"
        ) {
          setSaveStatus("error");

          setError("Conflict detected. Another user updated this document.");

          return;
        }

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Save failed.");
        }

        setSaveStatus("error");
      }
    }

    autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedContent, document, isInitialLoaded]);

  useEffect(() => {
    if (!document) return;

    const socket = getSocket();

    if (!currentUser) return;

    socket.emit("join-document", {
      documentId: document.id,
      user: {
        id: currentUser.id,
        email: currentUser.email,
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

    socket.on("user-typing-start", (user: CurrentUser) => {
      setTypingUsers((prev) => {
        if (prev.includes(user.email)) return prev;
        return [...prev, user.email];
      });
    });

    socket.on("user-typing-stop", (user: CurrentUser) => {
      setTypingUsers((prev) => prev.filter((email) => email !== user.email));
    });

    socket.on(
      "receive-cursor-change",
      (payload: { user: CurrentUser; position: number }) => {
        setRemoteCursors((prev) => {
          const others = prev.filter((item) => item.userId !== payload.user.id);

          return [
            ...others,
            {
              userId: payload.user.id,
              email: payload.user.email,
              position: payload.position,
            },
          ];
        });
      },
    );

    return () => {
      socket.off("presence-update");
      socket.off("receive-document-change");
      socket.off("user-typing-start");
      socket.off("user-typing-stop");
      socket.off("receive-cursor-change");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id, currentUser]);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load user.");
        }
      }
    }

    loadUser();
  }, []);

  function emitTyping() {
    if (!document || !currentUser) return;

    const socket = getSocket();

    socket.emit("typing-start", {
      documentId: document.id,
      user: currentUser,
    });

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing-stop", {
        documentId: document.id,
        user: currentUser,
      });
    }, 1000);
  }

  function emitCursorPosition(position: number) {
    if (!document || !currentUser) return;

    getSocket().emit("cursor-change", {
      documentId: document.id,
      user: currentUser,
      position,
    });
  }

  async function inviteCollaborator() {
    if (!document) return;

    setInviteStatus("");

    try {
      const res = await fetch(`/api/documents/${document.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteStatus(data.error || "Invite failed");
        return;
      }

      setDocument((prev) => {
        if (!prev) return prev;

        const alreadyExists = prev.collaborators.some(
          (item) => item.user.id === data.collaborator.user.id,
        );

        if (alreadyExists) return prev;

        return {
          ...prev,
          collaborators: [...prev.collaborators, data.collaborator],
        };
      });

      setInviteStatus("Invite sent");
      setInviteEmail("");
    } catch {
      setInviteStatus("Invite failed");
    }
  }

  async function removeCollaborator(userId: string) {
    if (!document) return;

    try {
      const res = await fetch(
        `/api/documents/${document.id}/collaborators/${userId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setInviteStatus(data.error || "Failed to remove collaborator");
        return;
      }

      setDocument((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          collaborators: prev.collaborators.filter(
            (item) => item.user.id !== userId,
          ),
        };
      });

      setInviteStatus("Collaborator removed");
    } catch {
      setInviteStatus("Failed to remove collaborator");
    }
  }

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
      <header className="border-b border-slate-300 bg-slate-900 px-6 py-4">
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
                  {user.email.slice(0, 1).toUpperCase()}
                </div>
              ))}

              {document?.isOwner && (
                <div className="flex items-center gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Invite by email"
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  />

                  <button
                    type="button"
                    onClick={inviteCollaborator}
                    className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
                  >
                    Invite
                  </button>
                </div>
              )}

              {document?.isOwner && document!.collaborators.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Collaborators
                  </p>

                  <div className="flex flex-col gap-2">
                    {document.collaborators.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md bg-slate-950 px-3 py-2"
                      >
                        <span className="text-sm text-slate-300">
                          {item.user.email}
                        </span>

                        <button
                          onClick={() => removeCollaborator(item.user.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inviteStatus && (
                <p className="text-sm text-slate-400">{inviteStatus}</p>
              )}
              {document && !document.isOwner && (
                <p className="text-sm text-slate-500">Shared with you</p>
              )}
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
            emitTyping();

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

        {typingUsers.length > 0 && (
          <p className="mt-3 text-sm text-sky-400">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.length} people are typing...`}
          </p>
        )}

        <RichTextEditor
          content={content}
          onChange={(html) => {
            setContent(html);
            setSaveStatus("idle");

            if (document) {
              getSocket().emit("document-change", {
                documentId: document.id,
                title,
                content: html,
              });
            }
          }}
          onTyping={emitTyping}
          onCursorChange={emitCursorPosition}
        />

        {remoteCursors.length > 0 && (
          <div className="mt-4 flex flex-col gap-1 text-sm text-purple-400">
            {remoteCursors.map((cursor) => (
              <p key={cursor.userId}>
                {cursor.email} is editing around character {cursor.position}
              </p>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </section>
    </main>
  );
}
