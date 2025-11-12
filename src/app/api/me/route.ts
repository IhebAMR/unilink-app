import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import { getUserFromRequest } from '@/app/lib/auth';
import User from '@/app/models/User';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const payload = getUserFromRequest(request);
    if (!payload || !payload.id) return NextResponse.json({ user: null }, { status: 200 });

    const user = await User.findById(payload.id).lean().exec();
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    // sanitize
    const { passwordHash, resetPasswordToken, verificationToken, ...safe } = user as any;

    // Explicitly disable any caching for this identity endpoint
    const res = NextResponse.json({ user: safe }, { status: 200 });
    // Debug: log which user is returned (remove after verification)
    try { console.log('[api/me] user', { id: (user as any)._id?.toString?.(), email: (user as any).email }); } catch {}
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (err) {
    console.error('GET /api/me error:', err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
