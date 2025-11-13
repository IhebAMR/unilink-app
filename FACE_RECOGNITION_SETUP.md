# Face Recognition Login Setup

This application now supports face recognition login using face-api.js.

## Features

- **Face Registration**: Users can register their face in their profile settings
- **Face Login**: Users can log in using face recognition from the login page
- **Secure Storage**: Face descriptors are stored securely in the database
- **Multiple Samples**: The system captures 3 face samples for better accuracy

## Setup Instructions

### 1. Models Setup (Optional but Recommended)

The face-api.js models can be loaded from a CDN (automatic fallback), but for better performance and offline support, you can download them locally:

#### Option A: Automatic GitHub Loading (Default)
The application will automatically load models from GitHub raw content if local models are not found. This works but may be slower. No action needed, but downloading locally is recommended for better performance.

#### Option B: Download Models Locally

Run the download script to get models locally:

```bash
node scripts/download-face-models.js
```

This will download the required models to `public/models/` directory.

### 2. Environment Variables

No additional environment variables are required. The face recognition feature uses the existing JWT authentication system.

### 3. Database

The User model has been updated to include:
- `faceDescriptors`: Array of face descriptor arrays (128 dimensions each)
- `hasFaceRecognition`: Boolean flag indicating if face recognition is enabled

## Usage

### For Users

1. **Register Face**:
   - Log in to your account
   - Go to Profile page
   - Click "Activer" under "Reconnaissance faciale"
   - Allow camera access when prompted
   - Position your face in front of the camera
   - Click "Capturer mon visage" to capture 3 samples
   - Wait for confirmation

2. **Login with Face**:
   - Go to the login page
   - Click "Se connecter avec la reconnaissance faciale"
   - Allow camera access when prompted
   - Position your face in front of the camera
   - Click "Vérifier mon visage"
   - You'll be logged in automatically if your face is recognized

### For Developers

#### API Endpoints

1. **Register Face** (`POST /api/auth/face-register`):
   - Requires authentication (user must be logged in)
   - Body: `{ faceDescriptors: number[][] }`
   - Stores face descriptors for the authenticated user

2. **Verify Face** (`POST /api/auth/face-verify`):
   - Public endpoint (no authentication required)
   - Body: `{ faceDescriptor: number[] }`
   - Returns JWT token and user data if face matches
   - Sets authentication cookie

#### Components

- `FaceCapture`: Component for capturing and registering faces
- `FaceLogin`: Component for face recognition login

#### Utilities

- `face-recognition.ts`: Utility functions for face matching
  - `euclideanDistance()`: Calculate distance between descriptors
  - `findBestMatch()`: Find best matching face from stored descriptors
  - `averageDescriptor()`: Calculate average from multiple descriptors

## Security Considerations

1. **Face Descriptors**: Face descriptors are mathematical representations, not images. They cannot be reverse-engineered to recreate the original face.

2. **Threshold**: The face matching threshold is set to 0.6 (lower = more strict). You can adjust this in `src/app/api/auth/face-verify/route.ts`.

3. **Multiple Samples**: The system stores multiple face samples per user for better accuracy and to handle variations in lighting, angle, etc.

4. **Fallback**: Users can always use email/password login if face recognition fails.

## Troubleshooting

### Models Not Loading

If you see errors about models not loading:
1. Check browser console for specific errors
2. Ensure camera permissions are granted
3. Try using the CDN fallback (automatic)
4. For local models, ensure they're in `public/models/`

### Face Not Recognized

1. Ensure good lighting
2. Look directly at the camera
3. Remove glasses/hats if possible
4. Try re-registering your face with better conditions
5. Use email/password login as fallback

### Camera Access Issues

1. Check browser permissions
2. Ensure HTTPS (required for camera access in production)
3. Check if camera is being used by another application

## Performance

- Models are loaded once and cached
- Face detection runs in real-time using WebGL acceleration
- Face matching is done server-side for security
- Multiple samples improve accuracy but increase storage

## Future Enhancements

- Face recognition for profile pictures
- Face-based access control for events
- Biometric authentication for sensitive operations
- Face aging/update mechanism

