'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FaceCapture from '@/app/components/FaceCapture';

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

interface PasswordData {
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    newPassword: '',
    confirmPassword: '',
  });
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setIsChangingPassword(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setError('');
      } else {
        setError('Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Error updating password');
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-base font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-500 text-sm">Gérez vos informations personnelles</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Fields */}
        <div className="bg-white shadow-sm rounded-xl divide-y divide-gray-100">
          {/* Name */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 rounded-md">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Nom</h3>
              </div>
              <button 
                onClick={() => handleEditField('name')}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50 transition-colors duration-150"
              >
                {editingField === 'name' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'name' ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                  placeholder="Entrez votre nom"
                />
                <button 
                  onClick={() => handleSaveField('name')}
                  className="inline-flex items-center text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <p className="mt-2 text-gray-600">{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-green-50 rounded-md">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Email</h3>
              </div>
              <button 
                onClick={() => handleEditField('email')}
                className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-800 rounded-md hover:bg-green-50 transition-colors duration-150"
              >
                {editingField === 'email' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'email' ? (
              <div className="mt-3 space-y-2">
                <input
                  type="email"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors duration-150"
                  placeholder="Entrez votre email"
                />
                <button 
                  onClick={() => handleSaveField('email')}
                  className="inline-flex items-center text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <p className="mt-2 text-gray-600">{user.email}</p>
            )}
          </div>

          {/* Points */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-50 rounded-md">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Points</h3>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                  {user.points}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 rounded-md">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Bio</h3>
              </div>
              <button 
                onClick={() => handleEditField('bio')}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 rounded-md hover:bg-indigo-50 transition-colors duration-150"
              >
                {editingField === 'bio' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'bio' ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
                  placeholder="Décrivez-vous en quelques mots"
                  rows={3}
                />
                <button 
                  onClick={() => handleSaveField('bio')}
                  className="inline-flex items-center text-sm bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <p className="mt-2 text-gray-600">{user.bio || 'Aucune bio'}</p>
            )}
          </div>

          {/* Class Section */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-pink-50 rounded-md">
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Classe</h3>
              </div>
              <button 
                onClick={() => handleEditField('classSection')}
                className="px-3 py-1.5 text-sm font-medium text-pink-600 hover:text-pink-800 rounded-md hover:bg-pink-50 transition-colors duration-150"
              >
                {editingField === 'classSection' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'classSection' ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-150"
                  placeholder="Ex: 2ème année Informatique"
                />
                <button 
                  onClick={() => handleSaveField('classSection')}
                  className="inline-flex items-center text-sm bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <p className="mt-2 text-gray-600">{user.classSection || 'Non spécifié'}</p>
            )}
          </div>

          {/* Courses */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Cours</h3>
              </div>
              <button 
                onClick={() => handleEditField('courses')}
                className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-800 rounded-md hover:bg-orange-50 transition-colors duration-150"
              >
                {editingField === 'courses' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'courses' ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-150"
                  placeholder="Séparez les cours par des virgules"
                />
                <p className="text-xs text-gray-500">Ex: Mathématiques, Physique, Programmation</p>
                <button 
                  onClick={() => handleSaveField('courses')}
                  className="inline-flex items-center text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <div className="mt-2">
                {user.courses && user.courses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.courses.map((course, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {course}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Aucun cours ajouté</p>
                )}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-teal-50 rounded-md">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Compétences</h3>
              </div>
              <button 
                onClick={() => handleEditField('skills')}
                className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-800 rounded-md hover:bg-teal-50 transition-colors duration-150"
              >
                {editingField === 'skills' ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editingField === 'skills' ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-150"
                  placeholder="Séparez les compétences par des virgules"
                />
                <p className="text-xs text-gray-500">Ex: JavaScript, Python, Design</p>
                <button 
                  onClick={() => handleSaveField('skills')}
                  className="inline-flex items-center text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            ) : (
              <div className="mt-2">
                {user.skills && user.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Aucune compétence ajoutée</p>
                )}
              </div>
            )}
          </div>

          {/* Face Recognition */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-cyan-50 rounded-md">
                  <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Reconnaissance faciale</h3>
              </div>
              {user.hasFaceRecognition ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-md">
                    ✓ Activée
                  </span>
                  <button 
                    onClick={() => setShowFaceRegistration(!showFaceRegistration)}
                    disabled={isDeletingFace}
                    className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-800 rounded-md hover:bg-orange-50 transition-colors duration-150 disabled:opacity-50"
                  >
                    {showFaceRegistration ? 'Annuler' : 'Modifier'}
                  </button>
                  <button 
                    onClick={handleDeleteFace}
                    disabled={isDeletingFace}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 rounded-md hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                  >
                    {isDeletingFace ? 'Suppression...' : 'Désactiver'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowFaceRegistration(!showFaceRegistration)}
                  className="px-3 py-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-800 rounded-md hover:bg-cyan-50 transition-colors duration-150"
                >
                  {showFaceRegistration ? 'Annuler' : 'Activer'}
                </button>
              )}
            </div>
            {showFaceRegistration && (
              <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">
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
                  <p className="text-sm text-blue-600 text-center">Enregistrement en cours...</p>
                )}
              </div>
            )}
            {user.hasFaceRecognition && (
              <p className="mt-2 text-sm text-gray-600">
                Vous pouvez vous connecter avec la reconnaissance faciale depuis la page de connexion.
              </p>
            )}
          </div>

          {/* Password */}
          <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-50 rounded-md">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900">Mot de passe</h3>
              </div>
              <button 
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-800 rounded-md hover:bg-purple-50 transition-colors duration-150"
              >
                {isChangingPassword ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {isChangingPassword && (
              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-1">
                  <label htmlFor="newPassword" className="block text-sm text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-150"
                    minLength={6}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="block text-sm text-gray-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirmez votre mot de passe"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-150"
                    minLength={6}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full inline-flex items-center justify-center bg-purple-500 text-white px-4 py-2 text-sm rounded-lg hover:bg-purple-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Changer le mot de passe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
