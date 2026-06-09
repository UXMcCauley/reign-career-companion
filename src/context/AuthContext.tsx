import React, { createContext, useContext, useState } from 'react';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('reign_auth') === 'true'
  );
  const [userName, setUserName] = useState(
    () => localStorage.getItem('reign_user_name') || ''
  );

  const login = async (username: string, password: string) => {
    await new Promise(r => setTimeout(r, 950));
    const validUser = import.meta.env.VITE_DEMO_USERNAME;
    const validPass = import.meta.env.VITE_DEMO_PASSWORD;
    if (username === validUser && password === validPass) {
      localStorage.setItem('reign_auth', 'true');
      localStorage.setItem('reign_user_name', defaultLoggedInEmployee.displayName);
      setIsAuthenticated(true);
      setUserName(defaultLoggedInEmployee.displayName);
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials. Try the demo account below.' };
  };

  const signup = async (name: string, _email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 1200));
    localStorage.setItem('reign_auth', 'true');
    localStorage.setItem('reign_user_name', name);
    setIsAuthenticated(true);
    setUserName(name);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('reign_auth');
    localStorage.removeItem('reign_user_name');
    setIsAuthenticated(false);
    setUserName('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userName, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
