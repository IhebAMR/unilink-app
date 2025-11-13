import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/lib/auth';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { averageDescriptor } from '@/app/lib/face-recognition';

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Get authenticated user (they should be logged in to register their face)
    const userPayload = getUserFromRequest(request);
    if (!userPayload || !userPayload.id) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter d\'abord.' },
        { status: 401 }
      );
    }

    const { faceDescriptors } = await request.json();

    if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
      return NextResponse.json(
        { error: 'Descripteurs faciaux manquants ou invalides' },
        { status: 400 }
      );
    }

    // Validate descriptor format (should be arrays of numbers)
    for (const descriptor of faceDescriptors) {
      if (!Array.isArray(descriptor) || descriptor.length !== 128) {
        return NextResponse.json(
          { error: 'Format de descripteur facial invalide' },
          { status: 400 }
        );
      }
    }

    // Find user
    const user = await User.findById(userPayload.id);
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Store face descriptors (this will update if already exists)
    // Option 1: Store all descriptors
    // Option 2: Store average descriptor (more efficient, but less flexible)
    // We'll store all descriptors for better accuracy
    
    // Ensure descriptors are properly formatted as arrays of numbers
    const formattedDescriptors = faceDescriptors.map(desc => 
      Array.isArray(desc) ? desc.map(d => typeof d === 'number' ? d : parseFloat(d)) : desc
    );
    
    const isUpdate = user.hasFaceRecognition && user.faceDescriptors && user.faceDescriptors.length > 0;
    user.faceDescriptors = formattedDescriptors;
    user.hasFaceRecognition = true;
    
    // Force save and verify
    await user.save();
    
    // Verify the data was saved correctly (only in development)
    if (process.env.NODE_ENV === 'development') {
      const savedUser = await User.findById(user._id).select('faceDescriptors hasFaceRecognition');
      console.log(`[Face Register] User ${user.email} ${isUpdate ? 'updated' : 'registered'} ${formattedDescriptors.length} face descriptors`);
    }

    return NextResponse.json(
      { 
        message: 'Visage enregistré avec succès',
        hasFaceRecognition: true,
        descriptorsCount: faceDescriptors.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Face registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'enregistrement du visage' },
      { status: 500 }
    );
  }
}

