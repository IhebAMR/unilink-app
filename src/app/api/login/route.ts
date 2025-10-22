import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_NAME = 'unilink_token';
// Use a string expiry to match the SignOptions 'expiresIn' typing
const TOKEN_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('Please set JWT_SECRET in your environment (.env.local)');
}

// Tell TypeScript this is definitely a jwt.Secret
const SECRET: jwt.Secret = JWT_SECRET as jwt.Secret;

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Veuillez remplir tous les champs' }, { status: 400 });
    }

    // Find user and explicitly select the passwordHash field
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 400 });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 400 });
    }

    // Create JWT payload
    const payload = { id: user._id.toString(), email: user.email, role: user.role };

    // Use SECRET typed as jwt.Secret and a string expiry
    const token = jwt.sign(payload, SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    // Remove sensitive data before sending response
    const { passwordHash: _, verificationToken: __, ...userWithoutPassword } = user.toObject();

    // Build response and set the HttpOnly cookie
    const res = NextResponse.json(
      { message: 'Connexion réussie', user: userWithoutPassword },
      { status: 200 }
    );

    res.cookies.set({
      name: TOKEN_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // maxAge expects seconds; if you need numeric maxAge, compute from TOKEN_EXPIRES_IN
      // here we keep cookie lifetime aligned roughly by setting maxAge to 7 days in seconds:
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue lors de la connexion' }, { status: 500 });
  }
}