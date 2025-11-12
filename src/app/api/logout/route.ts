import { NextResponse } from 'next/server';

const TOKEN_NAME = 'unilink_token';

export async function POST() {
  // Clear the auth cookie by expiring it immediately
  const res = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  res.cookies.set({
    name: TOKEN_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
