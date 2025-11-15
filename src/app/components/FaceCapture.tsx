'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadFaceApiModels, areModelsLoaded } from '@/app/lib/face-api-models';

interface FaceCaptureProps {
  onFaceCaptured: (descriptors: number[][]) => void;
  onError?: (error: string) => void;
  isCapturing?: boolean;
}

interface CapturePreview {
  id: number;
  dataUrl: string;
  descriptor: number[];
}

const REQUIRED_CAPTURES = 3;

export default function FaceCapture({ onFaceCaptured, onError, isCapturing = false }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captures, setCaptures] = useState<CapturePreview[]>([]);
  const [error, setError] = useState<string>('');

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

    if (!isCapturing) {
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
        console.error('[FaceCapture] Error accessing camera:', err);
        const message = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
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
  }, [modelsLoaded, isCapturing, onError]);

  useEffect(() => {
    if (isCapturing) {
      setCaptures([]);
      setError('');
    }
  }, [isCapturing]);

  const capturePhoto = async () => {
    if (!videoRef.current || !modelsLoaded || !isCapturing) return;

    if (captures.length >= REQUIRED_CAPTURES) {
      const message = `Vous avez déjà capturé ${REQUIRED_CAPTURES} photos. Supprimez-en une pour en reprendre une nouvelle.`;
      setError(message);
      onError?.(message);
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      const message = 'La caméra n\'est pas encore prête. Veuillez patienter une seconde.';
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

      // Dynamically import face-api on the client when needed to avoid server bundling (and 'fs' errors)
      const faceapi = await import('face-api.js');

      const detectionOptions: any[] = [
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 }),
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
        new faceapi.TinyFaceDetectorOptions({ inputSize: 192, scoreThreshold: 0.5 }),
      ];

      let detection: any | undefined;

      for (const options of detectionOptions) {
        detection = await faceapi
          .detectSingleFace(captureCanvas, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

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

      const descriptorArray = Array.from(detection.descriptor) as number[];
      const dataUrl = captureCanvas.toDataURL('image/png');

      setCaptures(prev => [...prev, { id: Date.now(), dataUrl, descriptor: descriptorArray }]);
    } catch (err: any) {
      console.error('[FaceCapture] Error capturing face:', err);
      const message = err?.message
        ? `Erreur lors de la capture: ${err.message}`
        : 'Erreur lors de la capture du visage.';
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeCapture = (id: number) => {
    setCaptures(prev => prev.filter(capture => capture.id !== id));
  };

  const handleFinish = () => {
    if (captures.length < REQUIRED_CAPTURES) {
      const message = `Veuillez capturer au moins ${REQUIRED_CAPTURES} photos avant de valider.`;
      setError(message);
      onError?.(message);
      return;
    }

    const descriptorsToSave = captures.slice(0, REQUIRED_CAPTURES).map(capture => capture.descriptor);
    onFaceCaptured(descriptorsToSave);
    setCaptures([]);
    setError('');
  };

  const handleReset = () => {
    setCaptures([]);
    setError('');
  };

  const instructions =
    'Prenez 3 photos (de face et légèrement de chaque côté) pour améliorer la reconnaissance.';

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Chargement des modèles de reconnaissance faciale...</p>
      </div>
    );
  }

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
            display: isCapturing ? 'block' : 'none',
          }}
        />
        {!isCapturing && (
          <div
            style={{
              width: '100%',
              padding: '40px 20px',
              color: '#555',
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
            }}
          >
            <p>Activez la capture pour accéder à la caméra.</p>
          </div>
        )}
      </div>

      <p style={{ marginTop: '12px', fontSize: '14px', color: '#555' }}>{instructions}</p>

      {error && (
        <p style={{ color: '#d32f2f', fontSize: '14px', marginTop: '8px' }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {captures.map(capture => (
          <div
            key={capture.id}
            style={{ position: 'relative', width: '100px', height: '100px' }}
          >
            <img
              src={capture.dataUrl}
              alt="Capture"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '1px solid #ddd',
              }}
            />
            <button
              type="button"
              onClick={() => removeCapture(capture.id)}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                lineHeight: '24px',
              }}
              aria-label="Supprimer cette photo"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={capturePhoto}
          disabled={
            isProcessing ||
            !modelsLoaded ||
            !isCapturing ||
            captures.length >= REQUIRED_CAPTURES
          }
          style={{
            padding: '10px 20px',
            backgroundColor:
              isProcessing || !isCapturing || captures.length >= REQUIRED_CAPTURES
                ? '#94a3b8'
                : '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor:
              isProcessing || !isCapturing || captures.length >= REQUIRED_CAPTURES
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {isProcessing
            ? 'Capture en cours...'
            : `Prendre une photo (${captures.length}/${REQUIRED_CAPTURES})`}
        </button>

        <button
          type="button"
          onClick={handleFinish}
          disabled={captures.length < REQUIRED_CAPTURES || isProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor:
              captures.length >= REQUIRED_CAPTURES && !isProcessing ? '#16a34a' : '#94a3b8',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor:
              captures.length >= REQUIRED_CAPTURES && !isProcessing ? 'pointer' : 'not-allowed',
          }}
        >
          Valider mes photos
        </button>

        {captures.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
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
            Tout recommencer
          </button>
        )}
      </div>
    </div>
  );
}

