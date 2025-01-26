'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, removeAuthToken, setAuthToken } from './index';

interface AuthContextType {
  email: string | null;
  setEmail: (email: string | null) => void;
  login: (email: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Simula l'ottenimento dell'email dal token o da un'API
      const dummyEmail = 'utente@esempio.com'; // Sostituisci con un'API reale
      setEmail(dummyEmail);
    }
  }, []);

  const login = (email: string, token: string) => {
    setAuthToken(token);
    setEmail(email);
  };

  const logout = () => {
    removeAuthToken();
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ email, setEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato all’interno di AuthProvider');
  }
  return context;
};
