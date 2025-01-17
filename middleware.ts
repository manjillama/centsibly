// Ref: https://stackoverflow.com/questions/67560587/how-to-protect-routes-in-next-js-next-auth
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const anonymousRoutes = ["/signin", "/signup", "/contact", "/legal"];
const publicFileRegex = /\.(.*)$/;

export default withAuth(
  async function middleware(req) {
    const response = NextResponse.next();
    return response;
  },
  {
    callbacks: {
      authorized: ({ req }) => {
        const { pathname } = req.nextUrl;

        return Boolean(
          req.cookies.get("next-auth.session-token") ||
            pathname === "/" || // exclude home page
            pathname.startsWith("/_next") || // exclude Next.js internals
            pathname.startsWith("/api") || //  exclude all API routes
            pathname.startsWith("/static") || // exclude static files
            publicFileRegex.test(pathname) || // exclude all files in the public folder
            anonymousRoutes.some((path) => pathname.startsWith(path))
        );
      },
    },
    pages: { signIn: "/signin", error: "/signin" },
  }
);
