import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

// Next 16 renamed the middleware file convention to `proxy`. This replaces the
// former middleware.ts (which only re-exported this function and carried the
// matcher config); the config now lives here alongside the handler.
export default async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/auth/:path*"],
};
