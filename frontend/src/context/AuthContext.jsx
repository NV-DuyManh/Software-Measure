// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi app khởi động: kiểm tra token còn hợp lệ không
  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem("fp_token"))
      .finally(() => setLoading(false));
  }, []);

  function storeAuth(token, user) {
    localStorage.setItem("fp_token", token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("fp_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, storeAuth, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
