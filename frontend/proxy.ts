import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/earth(.*)", "/world(.*)", "/knowledge(.*)"]);

// Mock mode and the local dev-identity sandbox run without an account, so nothing is gated.
const openSite = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false" || Boolean(process.env.NEXT_PUBLIC_DEV_STUDENT_ID);

export default clerkMiddleware(async (auth, req) => {
  if (!openSite && isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
