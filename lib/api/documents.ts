export async function getDocuments() {
  const res = await fetch("/api/documents");

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch documents");
  }

  return data.documents;
}

export async function getDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch document");
  }

  return data.document;
}

export async function createDocument(title: string) {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to create document");
  }

  return data.document;
}

export async function updateDocument(
  id: string,
  payload: { title: string; content: string; updatedAt: string },
) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 409) {
      throw {
        type: "conflict",
        message: data.error,
        latestDocument: data.latestDocument,
      };
    }

    throw new Error(data.error || "Failed to update document");
  }

  return data.document;
}
