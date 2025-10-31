import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === Role.admin;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|logo.png|favicon.ico).*)"],
};

