import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { useToast } from './ToastContext';
import { createUserProfile, getUserProfile } from '../services/userService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    if (!isFirebaseConfigured) throw new Error("Firebase no está configurado.");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      addToast('Sesión iniciada correctamente', 'success');
      return result;
    } catch (error) {
      addToast(error.message, 'error');
      throw error;
    }
  };

  const register = async (email, password, displayName, role) => {
    if (!isFirebaseConfigured) throw new Error("Firebase no está configurado.");
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Crear perfil en Firestore
      const profile = await createUserProfile(result.user, { displayName, role });
      setUserProfile(profile);
      addToast('Cuenta creada correctamente', 'success');
      return result;
    } catch (error) {
      addToast(error.message, 'error');
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured) throw new Error("Firebase no está configurado.");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Intentar crear/obtener perfil
      const profile = await createUserProfile(result.user, { displayName: result.user.displayName, role: 'buyer' });
      setUserProfile(profile);
      addToast('Sesión iniciada con Google', 'success');
      return result;
    } catch (error) {
      addToast(error.message, 'error');
      throw error;
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOut(auth);
      addToast('Sesión cerrada', 'info');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const refreshProfile = async () => {
    if (!isFirebaseConfigured || !user) return;
    const profile = await getUserProfile(user.uid);
    setUserProfile(profile);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, login, register, loginWithGoogle, logout, refreshProfile, loading, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
