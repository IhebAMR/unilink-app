'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './profile.module.css';

// Dynamically import the heavy client-only FaceCapture component to prevent
// Next.js server-side bundling (this avoids server build errors like missing
// "fs" from face-api.js). The component will only load in the browser.
const FaceCapture = dynamic(() => import('@/app/components/FaceCapture'), { ssr: false });

interface User {
  name: string;
  email: string;
  bio?: string;
  classSection?: string;
  courses?: string[];
  skills?: string[];
  points: number;
  hasFaceRecognition?: boolean;
}


export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [isDeletingFace, setIsDeletingFace] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load the authenticated user from server (/api/me) rather than relying solely on localStorage.
    const loadUserData = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) {
          // If the endpoint fails treat as unauthenticated
          router.push('/login');
          return;
        }
        const json = await res.json();
        const serverUser = json?.user || null;
        if (!serverUser) {
          // fallback to localStorage if server has no user (but redirect to login)
          router.push('/login');
          return;
        }
        setUser(serverUser);
        // Keep localStorage in sync for components that rely on it
        try { localStorage.setItem('user', JSON.stringify(serverUser)); } catch {}
      } catch (err) {
        console.error('Error loading user data from /api/me:', err);
        router.push('/login');
      }
    };

    loadUserData();
  }, [router]);

  const handleEditField = (fieldName: string) => {
    if (editingField === fieldName) {
      setEditingField(null);
      setEditValue('');
    } else {
      setEditingField(fieldName);
      const currentValue = fieldName === 'courses' || fieldName === 'skills'
        ? user?.[fieldName]?.join(', ') || ''
        : user?.[fieldName as keyof User] || '';
      setEditValue(String(currentValue));
    }
  };

  const handleSaveField = async (fieldName: string) => {
    if (!user) return;

    let valueToUpdate: any = editValue;
    if (fieldName === 'courses' || fieldName === 'skills') {
      valueToUpdate = editValue.split(',').map(item => item.trim()).filter(Boolean);
    }

    console.log('Saving field:', fieldName, 'with value:', valueToUpdate);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          [fieldName]: valueToUpdate,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('Received updated user data:', updatedUser);
        
        // Make sure we preserve all user data
        const newUserData = {
          ...user,
          ...updatedUser
        };
        
        setUser(newUserData);
        
        // Update localStorage and trigger a custom userUpdated event
        const updatedData = JSON.stringify(newUserData);
        localStorage.setItem('user', updatedData);
          try { globalThis.dispatchEvent(new Event('userUpdated')); } catch (e) { /* ignore */ }

        // Reset editing state
        setEditingField(null);
        setEditValue('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile');
    }
  };

  

  const handleFaceCaptured = async (descriptors: number[][]) => {
    try {
      setIsRegisteringFace(true);
      const response = await fetch('/api/auth/face-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ faceDescriptors: descriptors }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Face registration successful:', data);
        setUser(prev => prev ? { ...prev, hasFaceRecognition: true } : null);
        setShowFaceRegistration(false);
        setIsRegisteringFace(false);
        setError('');
        // Update localStorage
        const updatedUser = { ...user, hasFaceRecognition: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Show success message
        const message = user.hasFaceRecognition 
          ? `✅ Visage modifié avec succès!\n\n${data.descriptorsCount || 2} nouveaux échantillons ont été sauvegardés.\nVous pouvez maintenant vous connecter avec votre nouveau visage.`
          : `✅ Visage enregistré avec succès!\n\n${data.descriptorsCount || 2} échantillons ont été sauvegardés.\nVous pouvez maintenant vous connecter avec la reconnaissance faciale.`;
        alert(message);
      } else {
        const errorMsg = data.error || 'Erreur lors de l\'enregistrement du visage';
        setError(errorMsg);
        setIsRegisteringFace(false);
        alert('❌ ' + errorMsg);
      }
    } catch (err: any) {
      console.error('Error registering face:', err);
      setError('Erreur lors de l\'enregistrement du visage');
      setIsRegisteringFace(false);
    }
  };

  const handleDeleteFace = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver la reconnaissance faciale ?\n\nVous devrez la réactiver pour utiliser cette fonctionnalité.')) {
      return;
    }

    try {
      setIsDeletingFace(true);
      const response = await fetch('/api/auth/face-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setUser(prev => prev ? { ...prev, hasFaceRecognition: false } : null);
        setError('');
        // Update localStorage
        const updatedUser = { ...user, hasFaceRecognition: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('✅ Reconnaissance faciale désactivée avec succès!');
      } else {
        const errorMsg = data.error || 'Erreur lors de la désactivation';
        setError(errorMsg);
        alert('❌ ' + errorMsg);
      }
    } catch (err: any) {
      console.error('Error deleting face:', err);
      setError('Erreur lors de la désactivation');
      alert('❌ Erreur lors de la désactivation');
    } finally {
      setIsDeletingFace(false);
    }
  };

  if (!user) {
    return <div className={styles.loader}>Loading...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className={styles.headerTitle}>Profile</h1>
            <p className={styles.headerSubtitle}>Gérez vos informations personnelles</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorBox}>
            <div>
              <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={styles.errorText}>{error}</p>
            </div>
          </div>
        )}

        {/* Profile Fields */}
        <div>
          {/* Name */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div className="p-1.5 bg-blue-50 rounded-md">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Nom</h3>
              </div>
              <button 
                onClick={() => handleEditField('name')}
                className={styles.editButton}
              >
                {editingField === 'name' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'name' ? (
              <div style={{ marginTop: 12 }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.input}
                  placeholder="Entrez votre nom"
                />
                <div style={{ marginTop: 10 }}>
                  <button 
                    onClick={() => handleSaveField('name')}
                    className={styles.saveButton}
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 10, color: '#6b7280' }}>{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#ecfdf5', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Email</h3>
              </div>
              <button onClick={() => handleEditField('email')} className={styles.editButton}>
                {editingField === 'email' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'email' ? (
              <div style={{ marginTop: 12 }}>
                <input
                  type="email"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.input}
                  placeholder="Entrez votre email"
                />
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleSaveField('email')} className={styles.saveButton}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 10, color: '#6b7280' }}>{user.email}</p>
            )}
          </div>

          {/* Points */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#fffbeb', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Points</h3>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#b45309', background: '#fff7ed', padding: '6px 10px', borderRadius: 8 }}>
                  {user.points}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#eef2ff', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Bio</h3>
              </div>
              <button onClick={() => handleEditField('bio')} className={styles.editButton}>
                {editingField === 'bio' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'bio' ? (
              <div style={{ marginTop: 12 }}>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.textarea}
                  placeholder="Décrivez-vous en quelques mots"
                  rows={3}
                />
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleSaveField('bio')} className={styles.saveButton}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 10, color: '#6b7280' }}>{user.bio || 'Aucune bio'}</p>
            )}
          </div>

          {/* Class Section */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#fff1f2', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Classe</h3>
              </div>
              <button onClick={() => handleEditField('classSection')} className={styles.editButton}>
                {editingField === 'classSection' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'classSection' ? (
              <div style={{ marginTop: 12 }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.input}
                  placeholder="Ex: 2ème année Informatique"
                />
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleSaveField('classSection')} className={styles.saveButton}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 10, color: '#6b7280' }}>{user.classSection || 'Non spécifié'}</p>
            )}
          </div>

          {/* Courses */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#fff7ed', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Cours</h3>
              </div>
              <button onClick={() => handleEditField('courses')} className={styles.editButton}>
                {editingField === 'courses' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'courses' ? (
              <div style={{ marginTop: 12 }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.input}
                  placeholder="Séparez les cours par des virgules"
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Ex: Mathématiques, Physique, Programmation</p>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleSaveField('courses')} className={styles.saveButton}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {user.courses && user.courses.length > 0 ? (
                  <div className={styles.tagContainer}>
                    {user.courses.map((course, index) => (
                      <span key={index} className={styles.tag}>{course}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280' }}>Aucun cours ajouté</p>
                )}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#ecfeff', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Compétences</h3>
              </div>
              <button onClick={() => handleEditField('skills')} className={styles.editButton}>
                {editingField === 'skills' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'skills' ? (
              <div style={{ marginTop: 12 }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.input}
                  placeholder="Séparez les compétences par des virgules"
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Ex: JavaScript, Python, Design</p>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleSaveField('skills')} className={styles.saveButton}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {user.skills && user.skills.length > 0 ? (
                  <div className={styles.tagContainer}>
                    {user.skills.map((skill, index) => (
                      <span key={index} className={styles.tag}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280' }}>Aucune compétence ajoutée</p>
                )}
              </div>
            )}
          </div>

          {/* Face Recognition */}
          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <div className={styles.fieldLabel}>
                <div style={{ padding: 6, background: '#ecfeff', borderRadius: 8 }}>
                  <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className={styles.fieldTitle}>Reconnaissance faciale</h3>
              </div>
              {user.hasFaceRecognition ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '6px 10px', background: '#ecfdf5', color: '#065f46', borderRadius: 8, fontWeight: 600 }}>✓ Activée</span>
                  <button onClick={() => setShowFaceRegistration(!showFaceRegistration)} disabled={isDeletingFace} className={styles.editButton}>
                    {showFaceRegistration ? 'Annuler' : 'Modifier'}
                  </button>
                  <button onClick={handleDeleteFace} disabled={isDeletingFace} className={styles.faceButton + ' ' + styles.faceDisable}>
                    {isDeletingFace ? 'Suppression...' : 'Désactiver'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowFaceRegistration(!showFaceRegistration)} className={styles.editButton}>
                  {showFaceRegistration ? 'Annuler' : 'Activer'}
                </button>
              )}
            </div>
            {showFaceRegistration && (
              <div style={{ marginTop: 12, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <p style={{ color: '#6b7280', marginBottom: 10 }}>
                  {user.hasFaceRecognition 
                    ? 'Modifiez votre visage enregistré. L\'ancien sera remplacé par le nouveau.'
                    : 'Enregistrez votre visage pour vous connecter rapidement sans mot de passe.'}
                  <br />
                  Assurez-vous d'être dans un endroit bien éclairé et de regarder directement la caméra.
                </p>
                <FaceCapture
                  onFaceCaptured={handleFaceCaptured}
                  onError={(err) => setError(err)}
                  isCapturing={showFaceRegistration && !isRegisteringFace}
                />
                {isRegisteringFace && (
                  <p style={{ color: '#0ea5b9', textAlign: 'center', marginTop: 8 }}>Enregistrement en cours...</p>
                )}
              </div>
            )}
            {user.hasFaceRecognition && (
              <p style={{ marginTop: 10, color: '#6b7280' }}>
                Vous pouvez vous connecter avec la reconnaissance faciale depuis la page de connexion.
              </p>
            )}
          </div>

          {/* Password section removed */}
        </div>
      </div>
    </div>
  );
}
