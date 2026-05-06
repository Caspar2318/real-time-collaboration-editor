import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function getUserId(req: NextRequest) {
  const token = req.cookies.get("rtc_token")?.value;

  if (!token) return null;

  return await verifyToken(token);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const documents = await db.document.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          collaborators: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { title } = await req.json();

  const document = await db.document.create({
    data: {
      title: title?.trim() || "Untitled Document",
      ownerId: userId,
    },
  });

  return NextResponse.json({ document });
}
