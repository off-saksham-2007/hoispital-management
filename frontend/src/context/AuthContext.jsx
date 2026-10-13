import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, demoLogin as apiDemoLogin } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(r => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const res = await apiLogin(credentials);
    setUser(res.data.user);
    return res.data.user;
  }

  async function quickDemoLogin(role) {
    const res = await apiDemoLogin(role);
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(data) {
    const res = await apiRegister(data);
    setUser(res.data.user);
    return res.data.user;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  function updateUser(updatedUser) {
    setUser(prev => ({ ...prev, ...updatedUser }));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, quickDemoLogin, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
