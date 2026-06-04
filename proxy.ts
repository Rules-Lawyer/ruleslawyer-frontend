import { auth0 } from "@/lib/auth0";

// Next 16 renamed the middleware file convention to `proxy`. It must be a NAMED
// `proxy` export taking the standard Request — a default export is NOT invoked
// by Next 16's proxy layer, so auth0.middleware would never run and no session
// cookie gets set (every authenticated page sees "no session").
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

// Auth0 v4 requires its middleware to run on (almost) ALL routes — not just
// /auth/* — so it can read and refresh the rolling session and expose it to
// `getSession()` in server components.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
