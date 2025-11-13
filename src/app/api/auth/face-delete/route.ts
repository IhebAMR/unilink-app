import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/lib/auth';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';

export async function DELETE(request: Request) {
  try {
    await dbConnect();

    // Get authenticated user
    const userPayload = getUserFromRequest(request);
    if (!userPayload || !userPayload.id) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter d\'abord.' },
        { status: 401 }
      );
    }

    // Find user
    const user = await User.findById(userPayload.id);
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Remove face descriptors
    user.faceDescriptors = [];
    user.hasFaceRecognition = false;
    await user.save();

    console.log(`[Face Delete] User ${user.email} removed face recognition`);

    return NextResponse.json(
      { 
        message: 'Reconnaissance faciale désactivée avec succès',
        hasFaceRecognition: false
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Face deletion error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression du visage' },
      { status: 500 }
    );
  }
}


