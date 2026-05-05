import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, type } = await req.json();

    if (!email || !password || !type) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (type === "register") {
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 400 },
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      const token = await signToken(user.id);

      const res = NextResponse.json({ success: true });

      res.cookies.set("rtc_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    if (type === "login") {
      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      const token = await signToken(user.id);

      const res = NextResponse.json({ success: true });

      res.cookies.set("rtc_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    return NextResponse.json({ error: "Invalid auth type." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("rtc_token", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}
