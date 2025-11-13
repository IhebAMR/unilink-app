/**
 * Script to download face-api.js models
 * Run this script to download the required models to public/models/
 * 
 * Usage: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Use GitHub raw content URL for downloading models
const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

// Required models for face recognition
const MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log('Created models directory:', MODELS_DIR);
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('Starting download of face-api.js models...\n');

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const url = `${MODEL_BASE_URL}/${model}`;
    const filepath = path.join(MODELS_DIR, model);

    try {
      console.log(`[${i + 1}/${MODELS.length}] Downloading ${model}...`);
      await downloadFile(url, filepath);
      console.log(`✓ Downloaded ${model}\n`);
    } catch (error) {
      console.error(`✗ Failed to download ${model}:`, error.message);
      console.log('\nTrying alternative CDN...');
      
      // Try alternative CDN
      const altUrl = `https://cdn.jsdelivr.net/npm/face-api.js@latest/weights/${model}`;
      try {
        await downloadFile(altUrl, filepath);
        console.log(`✓ Downloaded ${model} from alternative CDN\n`);
      } catch (altError) {
        console.error(`✗ Failed to download ${model} from alternative CDN:`, altError.message);
        throw new Error(`Could not download ${model}`);
      }
    }
  }

  console.log('All models downloaded successfully!');
  console.log(`Models are available at: ${MODELS_DIR}`);
}

downloadModels().catch((error) => {
  console.error('Error downloading models:', error);
  process.exit(1);
});

