export interface CurrentUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await fetch("/api/me");

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch current user");
  }

  return data.user;
}
