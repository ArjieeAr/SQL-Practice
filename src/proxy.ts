import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session on every page request. Access tokens are short-lived; Server
 * Components can read cookies but not write them, so the refreshed token has to be written here,
 * before rendering, or users would be signed out when their token expires.
 *
 * This is not an authorization check. Protected work (the submit route) verifies the session itself.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          // Pass the new cookies to rendering (request) and back to the browser (response).
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache-Control: no-store, so a CDN never serves one user's session cookie to another.
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // Validates the token and refreshes it if it has expired (which triggers setAll above).
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Skip static assets, images, and the PGlite / Monaco files: they never need a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|data)$).*)",
  ],
};
