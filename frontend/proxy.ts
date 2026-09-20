import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/earth(.*)", "/world(.*)", "/knowledge(.*)"]);

// Mock mode runs the whole site without an account, so nothing is gated.
const mockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

export default clerkMiddleware(async (auth, req) => {
  if (!mockMode && isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
