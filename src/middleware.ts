import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Client users can only access /portal routes
    if (token?.role === "CLIENT" && !pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }

    // Non-admin users cannot access /benutzer (user management)
    if (pathname.startsWith("/benutzer") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/betriebe/:path*",
    "/dokumente/:path*",
    "/begehungen/:path*",
    "/gefahrstoffe/:path*",
    "/maschinen/:path*",
    "/gefaehrdungsbeurteilungen/:path*",
    "/benutzer/:path*",
    "/einstellungen/:path*",
    "/portal/:path*",
  ],
};
