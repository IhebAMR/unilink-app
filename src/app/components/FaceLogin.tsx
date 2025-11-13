'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels, areModelsLoaded } from '@/app/lib/face-api-models';

interface FaceLoginProps {
  onFaceVerified: (email: string) => void;
  onError?: (error: string) => void;
  isVerifying?: boolean;
}

const detectionAttempts = [
  new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 }),
  new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
  new faceapi.TinyFaceDetectorOptions({ inputSize: 192, scoreThreshold: 0.5 }),
];

export default function FaceLogin({ onFaceVerified, onError, isVerifying = false }: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModelsAsync = async () => {
      try {
        if (areModelsLoaded()) {
          if (isMounted) {
            setModelsLoaded(true);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        await loadFaceApiModels();
        if (isMounted) {
          setModelsLoaded(true);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          const message = `Erreur lors du chargement des modèles: ${err?.message || err}`;
          setError(message);
          onError?.(message);
          setIsLoading(false);
        }
      }
    };

    loadModelsAsync();

    return () => {
      isMounted = false;
    };
  }, [onError]);

  useEffect(() => {
    if (!modelsLoaded) return;

    if (!isVerifying) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setError('');
      } catch (err: any) {
        console.error('[FaceLogin] Error accessing camera:', err);
        const message = "Impossible d'accéder à la caméra. Vérifiez les permissions.";
        setError(message);
        onError?.(message);
      }
    };

    startVideo();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [modelsLoaded, isVerifying, onError]);

  useEffect(() => {
    if (!isVerifying) {
      setPreview(null);
      setError('');
    }
  }, [isVerifying]);

  const captureAndVerify = async () => {
    if (!videoRef.current || !modelsLoaded || !isVerifying) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      const message = 'La caméra n\'est pas prête. Veuillez patienter une seconde et réessayer.';
      setError(message);
      onError?.(message);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Impossible d\'initialiser la capture.');
      }

      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      const dataUrl = captureCanvas.toDataURL('image/png');
      setPreview(dataUrl);

      // Use `any` for detection to avoid strict face-api typings issues in the build.
      let detection: any | undefined;

      for (const options of detectionAttempts) {
        detection = await (faceapi
          .detectSingleFace(captureCanvas, options)
          .withFaceLandmarks()
          .withFaceDescriptor() as any);

        if (detection && detection.descriptor) {
          break;
        }
      }

      if (!detection || !detection.descriptor) {
        const message = 'Visage non détecté. Ajustez votre position ou l\'éclairage et réessayez.';
        setError(message);
        onError?.(message);
        return;
      }

      const descriptor = Array.from(detection.descriptor) as number[];
      if (descriptor.length !== 128 || descriptor.some(value => Number.isNaN(value))) {
        const message = 'Descripteur facial invalide. Veuillez réessayer.';
        setError(message);
        onError?.(message);
        return;
      }

      const response = await fetch('/api/auth/face-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ faceDescriptor: descriptor }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('[FaceLogin] Failed to parse verification response:', parseErr);
      }

      if (response.ok && data?.email) {
        onFaceVerified(data.email);
        setError('');
      } else {
        const message =
          data?.error ||
          'Visage non reconnu. Réessayez ou utilisez votre email/mot de passe.';
        setError(message);
        onError?.(message);
      }
    } catch (err: any) {
      console.error('[FaceLogin] Error verifying face:', err);
      const message = err?.message
        ? `Erreur lors de la vérification: ${err.message}`
        : 'Erreur lors de la vérification du visage.';
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setError('');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Chargement des modèles de reconnaissance faciale...</p>
      </div>
    );
  }

  const instructions =
    'Alignez votre visage dans la caméra, puis capturez une photo nette pour vérifier votre identité.';

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            display: isVerifying ? 'block' : 'none',
          }}
        />
        {!isVerifying && (
          <div
            style={{
              width: '100%',
              padding: '40px 20px',
              color: '#555',
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
            }}
          >
            <p>Activez la vérification pour accéder à la caméra.</p>
          </div>
        )}
      </div>

      <p style={{ marginTop: '12px', fontSize: '14px', color: '#555' }}>{instructions}</p>

      {preview && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#555' }}>Photo utilisée pour la vérification</p>
          <img
            src={preview}
            alt="Aperçu de la capture"
            style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: '8px',
              border: '1px solid #ddd',
            }}
          />
        </div>
      )}

      {error && (
        <p style={{ color: '#d32f2f', fontSize: '14px', marginTop: '8px' }}>{error}</p>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={captureAndVerify}
          disabled={isProcessing || !modelsLoaded || !isVerifying}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing || !isVerifying ? '#94a3b8' : '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: isProcessing || !isVerifying ? 'not-allowed' : 'pointer',
          }}
        >
          {isProcessing ? 'Vérification en cours...' : 'Capturer et vérifier'}
        </button>

        {preview && (
          <button
            type="button"
            onClick={handleRetake}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Reprendre une photo
          </button>
        )}
      </div>
    </div>
  );
}

