import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.TASTYTRADE_CLIENT_ID!
const REDIRECT_URI = process.env.TASTYTRADE_REDIRECT_URI ?? 'https://options-ochre.vercel.app/api/auth/callback'

// Redirects the user's browser to tastytrade's OAuth login page.
// The user logs in there; tastytrade then redirects back to /api/auth/callback?code=...
export async function GET() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'read openid',
  })
  return NextResponse.redirect(`https://api.tastyworks.com/oauth/authorize?${params}`)
}
