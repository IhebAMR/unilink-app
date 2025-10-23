import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/app/lib/mongoose";
import User from "@/app/models/User";
import crypto from "crypto";

// Helper function to clean user object
function sanitizeUser(user: any) {
  const userObj = user.toObject();
  delete userObj.passwordHash;
  delete userObj.verificationToken;
  return userObj;
}

export async function POST(request: Request) {
  try {
    // First connect to database
    await dbConnect();
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Données de requête invalides" },
        { status: 400 }
      );
    }

    // Extract and validate fields
    const { name, email, password } = body;

    // Enhanced input validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Le nom doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Veuillez fournir une adresse email valide" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const emailLowerCase = email.toLowerCase().trim();
    console.log("Attempting registration with email:", emailLowerCase);

    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email: emailLowerCase });
      
      if (existingUser) {
        console.log("Found existing user with email:", existingUser.email);
        return NextResponse.json(
          { error: `L'adresse email "${emailLowerCase}" est déjà utilisée.` },
          { status: 400 }
        );
      }
      
      console.log("No existing user found, proceeding with registration");
    } catch (error) {
      console.error("Error checking for existing user:", error);
      return NextResponse.json(
        { error: "Erreur lors de la vérification de l'email" },
        { status: 500 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
      // Drop any existing indexes before creating the user
      try {
        await User.collection.dropIndexes();
      } catch (err) {
        console.log('No indexes to drop or already dropped');
      }

      // Create user with minimal required fields
      const user = await User.create({
        name: name.trim(),
        email: emailLowerCase,
        passwordHash,
        role: "student",
        isVerified: false,
        verificationToken: crypto.randomBytes(32).toString("hex"),
        createdAt: new Date(),
        updatedAt: new Date(),
        carpool: {
          hasCar: false,
          seats: 0,
          homeLocation: {
            type: "Point",
            coordinates: [0, 0]
          },
          preferredRoutes: []
        }
      });

      console.log("User created successfully:", {
        id: user._id,
        name: user.name,
        email: user.email
      });

      // Remove sensitive data before sending response
      const userResponse = sanitizeUser(user);

      return NextResponse.json({
        message: "Compte créé avec succès",
        user: userResponse
      }, { status: 201 });

    } catch (dbError: any) {
      console.error("Database error during user creation:", dbError);

      if (dbError.name === "ValidationError") {
        const validationErrors = Object.values(dbError.errors).map((err: any) => err.message);
        return NextResponse.json(
          { error: `Erreur de validation: ${validationErrors.join(", ")}` },
          { status: 400 }
        );
      }

      if (dbError.code === 11000) {
        return NextResponse.json(
          { error: `L'adresse email "${emailLowerCase}" est déjà utilisée.` },
          { status: 400 }
        );
      }

      throw dbError; // Re-throw for general error handling
    }

  } catch (error: any) {
    // Log the full error for debugging
    console.error("Registration error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription. Veuillez réessayer dans quelques instants." },
      { status: 500 }
    );
  }
}
