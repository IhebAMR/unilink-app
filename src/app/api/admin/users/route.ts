import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongoose';
import User from '../../../models/User';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get admin email from token
    const adminEmail = authHeader.split(' ')[1];
    
    // Verify admin user
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    
    // Fetch all users except the current admin
    const users = await User.find({})
      .select('name email role isVerified isBanned createdAt lastLogin')
      .sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
