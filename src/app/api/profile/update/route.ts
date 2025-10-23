import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email, password, ...updateData } = body;

    console.log('Update request received:', { email, ...updateData });

    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    // First, get the current user data
    const currentUser = await User.findOne({ email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge the update data with current data
    const mergedData = {
      ...currentUser.toObject(),
      ...updateData,
      courses: updateData.courses?.filter(Boolean) || currentUser.courses,
      skills: updateData.skills?.filter(Boolean) || currentUser.skills,
    };

    // Remove sensitive fields from merged data
    delete mergedData.passwordHash;
    delete mergedData.resetPasswordToken;
    delete mergedData.verificationToken;
    delete mergedData._id;
    delete mergedData.__v;

    // Update the user with merged data
    const updatedUser = await User.findOneAndUpdate(
      { email },
      mergedData,
      { 
        new: true,
        runValidators: true
      }
    );

    // Convert to plain object and prepare response
    const userObject = updatedUser.toObject();
    delete userObject.passwordHash;
    delete userObject.resetPasswordToken;
    delete userObject.verificationToken;

    console.log('Sending updated user data:', userObject);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userObject);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
