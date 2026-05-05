"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocuments } from "@/lib/api/documents";

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createDocument() {
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create document.");
        setCreating(false);
        return;
      }

      router.push(`/documents/${data.document.id}`);
    } catch {
      setError("Failed to create document.");
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "DELETE",
    });

    router.replace("/login");
  }

  useEffect(() => {
    async function load() {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-sky-400">
              Your Documents
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Create and manage your collaborative documents.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 cursor-pointer"
          >
            Logout
          </button>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-medium">Create document</h2>

          <div className="mt-4 flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-500"
            />

            <button
              onClick={createDocument}
              disabled={creating}
              className="rounded-md bg-sky-600 px-4 py-2 font-medium text-white disabled:bg-slate-600 cursor-pointer"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        <section className="mt-8">
          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No documents yet. Create your first one.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left hover:border-sky-600 cursor-pointer"
                >
                  <h3 className="text-lg font-medium text-slate-100">
                    {doc.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {doc.content || "Empty document"}
                  </p>

                  <p className="mt-4 text-xs text-slate-500">
                    Updated {new Date(doc.updatedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
