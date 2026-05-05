import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function getUserId(req: NextRequest) {
  const token = req.cookies.get("rtc_token")?.value;

  if (!token) return null;

  return await verifyToken(token);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const document = await db.document.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { title, content } = await req.json();

  const existingDocument = await db.document.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!existingDocument) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const document = await db.document.update({
    where: { id },
    data: {
      title,
      content,
    },
  });

  return NextResponse.json({ document });
}
