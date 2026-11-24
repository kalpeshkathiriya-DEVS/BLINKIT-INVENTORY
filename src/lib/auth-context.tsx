'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getInventoryStore, Organization } from './store/inventory-store';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  orgCategory?: string;
  orgStatus: 'pending' | 'active' | 'blocked';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginAs: (role: UserRole, options?: { name?: string; phone?: string; orgId?: string }) => void;
  logout: () => void;
  impersonatingOrg: Organization | null;
  startImpersonation: (orgId: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginAs: () => {},
  logout: () => {},
  impersonatingOrg: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const store = getInventoryStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatingOrg, setImpersonatingOrg] = useState<Organization | null>(null);

  useEffect(() => {
    // Read session from localStorage
    const savedRole = localStorage.getItem('blinkit_user_role') as UserRole | null;
    const savedName = localStorage.getItem('blinkit_user_name');
    const savedOrgId = localStorage.getItem('blinkit_org_id');

    if (savedRole && (savedRole === 'superadmin' || savedRole === 'admin' || savedRole === 'user')) {
      applyUser(savedRole, { name: savedName || undefined, orgId: savedOrgId || undefined }, false);
    } else {
      // Unauthenticated visitor: user remains null
      setUser(null);
    }
    setLoading(false);
  }, []);

  function setCookies(role: UserRole, name: string, orgId?: string) {
    document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `user_name=${encodeURIComponent(name)}; path=/; max-age=86400; SameSite=Lax`;
    if (orgId) {
      document.cookie = `org_id=${encodeURIComponent(orgId)}; path=/; max-age=86400; SameSite=Lax`;
    }
  }

  function applyUser(role: UserRole, options?: { name?: string; phone?: string; orgId?: string }, redirect: boolean = true) {
    let authUser: AuthUser;
    const currentOrg = store.organizations.find(o => o.id === (options?.orgId || store.orgId)) || store.organizations[0];

    if (role === 'superadmin') {
      authUser = {
        id: 'user-superadmin',
        name: options?.name || 'Super Administrator',
        email: 'superadmin@blinkitops.com',
        role: 'superadmin',
        orgId: 'super-org',
        orgName: 'Platform Central',
        orgStatus: 'active',
      };
      store.setCurrentUser({ id: authUser.id, name: authUser.name, role: 'superadmin' });
      if (redirect) router.push('/super');
    } else if (role === 'admin') {
      authUser = {
        id: 'user-admin',
        name: options?.name || 'Apex Admin User',
        email: currentOrg.email || 'admin@apexessentials.in',
        role: 'admin',
        orgId: currentOrg.id,
        orgName: currentOrg.name,
        orgCategory: currentOrg.category,
        orgStatus: currentOrg.status,
      };
      store.setCurrentUser({ id: authUser.id, name: authUser.name, role: 'admin' });
      if (redirect) router.push('/admin');
    } else {
      // Staff User
      const staffMember = store.staffProfiles[0];
      authUser = {
        id: staffMember?.id || 'st-1',
        name: options?.name || staffMember?.name || 'Ravi Kumar',
        phone: options?.phone || staffMember?.phone || '9876543210',
        role: 'user',
        orgId: currentOrg.id,
        orgName: currentOrg.name,
        orgCategory: currentOrg.category,
        orgStatus: currentOrg.status,
      };
      store.setCurrentUser({ id: authUser.id, name: authUser.name, role: 'user' });
      if (redirect) router.push('/scan');
    }

    setUser(authUser);
    localStorage.setItem('blinkit_user_role', authUser.role);
    localStorage.setItem('blinkit_user_name', authUser.name);
    localStorage.setItem('blinkit_org_id', authUser.orgId);
    setCookies(authUser.role, authUser.name, authUser.orgId);
  }

  const loginAs = (role: UserRole, options?: { name?: string; phone?: string; orgId?: string }) => {
    applyUser(role, options, true);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('blinkit_user_role');
    localStorage.removeItem('blinkit_user_name');
    localStorage.removeItem('blinkit_org_id');
    document.cookie = 'user_role=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'user_name=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'org_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'demo_session=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
  };

  const startImpersonation = (orgId: string) => {
    const org = store.impersonateOrganization(orgId);
    setImpersonatingOrg(org);
    router.push('/admin');
  };

  const stopImpersonation = () => {
    store.stopImpersonating();
    setImpersonatingOrg(null);
    router.push('/super');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAs,
        logout,
        impersonatingOrg,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
