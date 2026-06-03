import { NextResponse } from "next/server";

// Readiness probe for the ALB target group (see ruleslawyer-infra
// services-stack: RuleslawyerFrontend healthCheckPath). Unlike '/', this is a
// route handler that only resolves once the Next.js server is fully booted and
// routing requests, so it returns a clean 200 — never a transient 404 from a
// half-initialized app, which the ALB would otherwise treat as healthy and
// start serving traffic to too early.
//
// force-dynamic + no caching guarantees every probe hits the running server
// rather than a cached/prerendered response.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
