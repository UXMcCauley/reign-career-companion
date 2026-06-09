import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('reign_auth') === 'true'
  );

  const login = async (username: string, password: string) => {
    await new Promise(r => setTimeout(r, 950));
    const validUser = import.meta.env.VITE_DEMO_USERNAME;
    const validPass = import.meta.env.VITE_DEMO_PASSWORD;
    if (username === validUser && password === validPass) {
      localStorage.setItem('reign_auth', 'true');
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials. Try the demo account below.' };
  };

  const signup = async (_name: string, _email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 1200));
    localStorage.setItem('reign_auth', 'true');
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('reign_auth');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
