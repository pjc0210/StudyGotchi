import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { SITE_GATED } from "@/lib/config";

const isProtected = createRouteMatcher(["/earth(.*)", "/world(.*)", "/knowledge(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (SITE_GATED && isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
