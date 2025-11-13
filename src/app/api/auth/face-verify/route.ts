import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { findBestMatch } from '@/app/lib/face-recognition';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_NAME = 'unilink_token';
const TOKEN_EXPIRES_IN = '7d';
const FACE_MATCH_THRESHOLD = 0.65; // Lower = more strict (increased for better matching)

if (!JWT_SECRET) {
  throw new Error('Please set JWT_SECRET in your environment (.env.local)');
}

const SECRET: jwt.Secret = JWT_SECRET as jwt.Secret;

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { faceDescriptor } = await request.json();

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return NextResponse.json(
        { error: 'Descripteur facial manquant ou invalide' },
        { status: 400 }
      );
    }

    // Get all users with face recognition enabled
    const users = await User.find({ 
      hasFaceRecognition: true,
      faceDescriptors: { $exists: true, $ne: [] }
    }).select('email faceDescriptors role _id').lean();

    if (!users || users.length === 0) {
      return NextResponse.json(
        { 
          error: 'Aucun visage enregistré trouvé. Veuillez d\'abord enregistrer votre visage dans les paramètres de votre profil, ou utilisez votre email et mot de passe pour vous connecter.',
          requiresRegistration: true
        },
        { status: 404 }
      );
    }

    // Try to match the face descriptor with stored descriptors
    // Use early exit for better performance
    let bestMatch: { user: any; distance: number } | null = null;
    const VERY_GOOD_MATCH_THRESHOLD = 0.4; // If we find a very good match, stop searching

    for (const user of users) {
      if (!user.faceDescriptors || user.faceDescriptors.length === 0) {
        continue;
      }

      // Ensure faceDescriptors are in the correct format (array of arrays)
      let formattedDescriptors: number[][];
      try {
        formattedDescriptors = user.faceDescriptors.map((desc: any) => {
          if (Array.isArray(desc)) {
            return desc.map((d: any) => typeof d === 'number' ? d : parseFloat(d));
          }
          return Array.from(desc).map((d: any) => typeof d === 'number' ? d : parseFloat(d));
        }).filter((desc: number[]) => desc.length === 128);
        
        if (formattedDescriptors.length === 0) {
          continue;
        }
      } catch (err) {
        continue;
      }

      const match = findBestMatch(faceDescriptor, formattedDescriptors, FACE_MATCH_THRESHOLD);
      
      if (match.isMatch) {
        if (!bestMatch || match.distance < bestMatch.distance) {
          bestMatch = {
            user,
            distance: match.distance
          };
          
          // Early exit if we found a very good match
          if (match.distance <= VERY_GOOD_MATCH_THRESHOLD) {
            break;
          }
        }
      }
    }

    if (!bestMatch) {
      return NextResponse.json(
        { 
          error: 'Visage non reconnu. Veuillez réessayer ou utiliser votre email et mot de passe.'
        },
        { status: 401 }
      );
    }

    // Face matched! Create JWT and log the user in
    const matchedUser = bestMatch.user;
    const payload = { 
      id: matchedUser._id.toString(), 
      email: matchedUser.email, 
      role: matchedUser.role 
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    // Remove sensitive data (use lean() result directly)
    const { faceDescriptors: _, ...userWithoutFaceData } = matchedUser;

    // Build response and set the HttpOnly cookie
    const res = NextResponse.json(
      { 
        message: 'Connexion réussie par reconnaissance faciale',
        email: matchedUser.email,
        user: userWithoutFaceData
      },
      { status: 200 }
    );

    res.cookies.set({
      name: TOKEN_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Update last login
    await User.findByIdAndUpdate(matchedUser._id, {
      lastLogin: new Date()
    });

    return res;
  } catch (error) {
    console.error('Face verification error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la vérification du visage' },
      { status: 500 }
    );
  }
}

