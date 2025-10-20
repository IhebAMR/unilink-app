import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs requis' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      verificationToken: crypto.randomUUID(),
    });

    // Remove sensitive data before sending response
    const { passwordHash: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({
      message: 'Compte créé avec succès',
      user: userWithoutPassword
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  }
}
