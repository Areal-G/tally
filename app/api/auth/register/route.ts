/**
 * POST /api/auth/register — disabled in the demo.
 *
 * The demo has no database to create accounts in; visitors use the
 * "Try demo" button on /login instead.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Sign-up is turned off in the demo. Use the demo roles on the login page." },
    { status: 403 },
  );
}
