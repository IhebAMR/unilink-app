'use client';

import React, { useState } from 'react';
import FaceLogin from '@/app/components/FaceLogin';
import FaceCapture from '@/app/components/FaceCapture';

export default function TestFaceRecognitionPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testFaceRegistration = async (descriptors: number[][]) => {
    addLog(`✅ Face captured: ${descriptors.length} descriptors`);
    setIsTesting(true);
    
    try {
      const response = await fetch('/api/auth/face-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ faceDescriptors: descriptors }),
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`✅ Face registered successfully!`);
        addLog(`   Descriptors saved: ${data.descriptorsCount || descriptors.length}`);
      } else {
        addLog(`❌ Registration failed: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Registration error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testFaceVerification = async (email: string) => {
    addLog(`✅ Face verified! Email: ${email}`);
    addLog(`✅ Login successful!`);
  };

  const testDatabase = async () => {
    addLog('🔍 Testing database connection...');
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      const data = await response.json();
      if (response.ok && data.user) {
        addLog(`✅ Database connected. User: ${data.user.email}`);
        addLog(`   Face recognition enabled: ${data.user.hasFaceRecognition || false}`);
      } else {
        addLog('⚠️ Not logged in. Please log in first to test face registration.');
      }
    } catch (err: any) {
      addLog(`❌ Database error: ${err.message}`);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Face Recognition Test & Debug</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Quick Tests</h2>
        <button 
          onClick={testDatabase}
          style={{ padding: '10px 20px', marginRight: '10px', marginBottom: '10px' }}
        >
          Test Database Connection
        </button>
        <button 
          onClick={clearLogs}
          style={{ padding: '10px 20px', marginBottom: '10px' }}
        >
          Clear Logs
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>Test Face Registration</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            You must be logged in to register your face.
          </p>
          <FaceCapture
            onFaceCaptured={testFaceRegistration}
            onError={(err) => addLog(`❌ Error: ${err}`)}
            isCapturing={!isTesting}
          />
        </div>

        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h2>Test Face Login</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Test face recognition login (you must have registered your face first).
          </p>
          <FaceLogin
            onFaceVerified={testFaceVerification}
            onError={(err) => addLog(`❌ Error: ${err}`)}
            isVerifying={true}
          />
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2>Test Logs</h2>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto', 
          backgroundColor: '#000', 
          color: '#0f0', 
          padding: '10px', 
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {testResults.length === 0 ? (
            <div style={{ color: '#888' }}>No logs yet. Start testing to see results...</div>
          ) : (
            testResults.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '5px' }}>{log}</div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>Debugging Tips:</h3>
        <ul style={{ fontSize: '14px' }}>
          <li>Check browser console (F12) for detailed error messages</li>
          <li>Make sure you're logged in before testing face registration</li>
          <li>Ensure camera permissions are granted</li>
          <li>Check that models are loaded (should see "Models loaded" in console)</li>
          <li>Verify face descriptors are being saved (check server logs)</li>
        </ul>
      </div>
    </div>
  );
}


