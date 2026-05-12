import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: string | null;
  email: string | null;
  branchId: number | null;
  branchName: string | null;
  businessUnit: string | null;
  login: (token: string, role: string, email: string, branchId: number | null, branchName: string | null, businessUnit: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));
  const [branchName, setBranchName] = useState<string | null>(localStorage.getItem('branchName'));
  const [businessUnit, setBusinessUnit] = useState<string | null>(localStorage.getItem('businessUnit'));
  const [branchId, setBranchId] = useState<number | null>(
    localStorage.getItem('branchId') ? Number(localStorage.getItem('branchId')) : null
  );

  const login = (newToken: string, newRole: string, newEmail: string, newBranchId: number | null, newBranchName: string | null, newBusinessUnit: string | null) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('email', newEmail);
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
    if (newBusinessUnit !== null) {
      localStorage.setItem('businessUnit', newBusinessUnit);
    } else {
      localStorage.removeItem('businessUnit');
    }
    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
    setBranchId(newBranchId);
    setBranchName(newBranchName);
    setBusinessUnit(newBusinessUnit);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('businessUnit');
    setToken(null);
    setRole(null);
    setEmail(null);
    setBranchId(null);
    setBranchName(null);
    setBusinessUnit(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, email, branchId, branchName, businessUnit, login, logout }}>
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
