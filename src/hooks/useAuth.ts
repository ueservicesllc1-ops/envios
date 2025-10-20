import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase/config';

export interface AuthUser {
  user: User | null;
  isAdmin: boolean;
  isSeller: boolean;
  loading: boolean;
}

export const useAuth = (): AuthUser => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'ueservicesllc1@gmail.com';
  const isSeller = Boolean(user && !isAdmin);

  return {
    user,
    isAdmin,
    isSeller,
    loading
  };
};
