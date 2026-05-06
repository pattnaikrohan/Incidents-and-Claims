import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: string | null;
  branchId: number | null;
  branchName: string | null;
  login: (token: string, role: string, branchId: number | null, branchName: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [branchName, setBranchName] = useState<string | null>(localStorage.getItem('branchName'));
  const [branchId, setBranchId] = useState<number | null>(
    localStorage.getItem('branchId') ? Number(localStorage.getItem('branchId')) : null
  );

  const login = (newToken: string, newRole: string, newBranchId: number | null, newBranchName: string | null) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    if (newBranchId !== null) {
      localStorage.setItem('branchId', newBranchId.toString());
    } else {
      localStorage.removeItem('branchId');
    }
    if (newBranchName !== null) {
      localStorage.setItem('branchName', newBranchName);
    } else {
      localStorage.removeItem('branchName');
    }
    setToken(newToken);
    setRole(newRole);
    setBranchId(newBranchId);
    setBranchName(newBranchName);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    setToken(null);
    setRole(null);
    setBranchId(null);
    setBranchName(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, branchId, branchName, login, logout }}>
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
