import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // This endpoint will receive the Firebase ID token from the client
  // and can be used to verify the token and set a session if needed.
  // For now, just return 200 OK for demo purposes.
  return NextResponse.json({ status: 'ok' });
}
