import { NextResponse } from 'next/server'

// Returns only the client ID (not secret) so the browser can start the OAuth flow.
export async function GET() {
  return NextResponse.json({ clientId: process.env.TASTYTRADE_CLIENT_ID ?? '' })
}
