import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: string | null;
  branchId: number | null;
  login: (token: string, role: string, branchId: number | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [branchId, setBranchId] = useState<number | null>(
    localStorage.getItem('branchId') ? Number(localStorage.getItem('branchId')) : null
  );

  const login = (newToken: string, newRole: string, newBranchId: number | null) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    if (newBranchId !== null) {
      localStorage.setItem('branchId', newBranchId.toString());
    } else {
      localStorage.removeItem('branchId');
    }
    setToken(newToken);
    setRole(newRole);
    setBranchId(newBranchId);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('branchId');
    setToken(null);
    setRole(null);
    setBranchId(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, branchId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
