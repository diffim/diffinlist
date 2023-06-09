import { withClerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server'

export default withClerkMiddleware((req: NextRequest) => {
  return NextResponse.next();
});

// Stop Middleware running on static files
export const config = {
    matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - _next
       * - static (static files)
       * - img.ico (favicon file)
       */
      "/(.*?trpc.*?|(?!static|.*\\..*|_next|img.ico).*)"
    ]
}