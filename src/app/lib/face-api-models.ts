/**
 * Global cache for face-api.js models to prevent reloading
 */

let modelsLoadingPromise: Promise<void> | null = null;
let modelsLoaded = false;

export async function loadFaceApiModels(): Promise<void> {
  // If already loaded, return immediately
  if (modelsLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (modelsLoadingPromise) {
    return modelsLoadingPromise;
  }

  // Start loading
  modelsLoadingPromise = (async () => {
    try {
      const faceapi = await import('face-api.js');
      const MODEL_URL = '/models';
      const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      
      try {
        // Try loading from local first
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('[FaceAPI Models] Loaded from local');
      } catch (localError) {
        // Fallback to GitHub raw content if local models don't exist
        console.log('[FaceAPI Models] Loading from GitHub...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(GITHUB_RAW_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(GITHUB_RAW_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(GITHUB_RAW_URL),
        ]);
        console.log('[FaceAPI Models] Loaded from GitHub');
      }

      modelsLoaded = true;
      console.log('[FaceAPI Models] All models loaded and cached');
    } catch (err) {
      console.error('[FaceAPI Models] Error loading models:', err);
      modelsLoadingPromise = null; // Reset so we can retry
      throw err;
    }
  })();

  return modelsLoadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}


