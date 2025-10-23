import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/app/lib/email';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Veuillez fournir une adresse email' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });

    // Even if we don't find the user, we send a success response for security
    if (!user) {
      return NextResponse.json({
        message: 'Si un compte existe avec cet email, vous recevrez les instructions pour réinitialiser votre mot de passe.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save reset token to user
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      }
    );

    // Send the password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email de réinitialisation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Si un compte existe avec cet email, vous recevrez les instructions pour réinitialiser votre mot de passe.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
