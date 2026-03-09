import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, Role } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  customRole: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<string, Record<string, Record<string, boolean>>> = {
  administrator: {
    orders: { create: true, read: true, update: true, delete: true, change_status: true },
    customers: { create: true, read: true, update: true, delete: true },
    payments: { create: true, read: true, update: true, delete: true, reverse: true },
    installments: { create: true, read: true, update: true, delete: true },
    expenses: { create: true, read: true, update: true, delete: true },
    lock: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
    users: { create: true, read: true, update: true, delete: true },
    exchange_rates: { create: true, read: true, update: true },
    audit_logs: { read: true },
    roles: { create: true, read: true, update: true, delete: true },
  },
  admin: {
    orders: { create: true, read: true, update: true, delete: true, change_status: true },
    customers: { create: true, read: true, update: true, delete: false },
    payments: { create: true, read: true, update: false, delete: false },
    installments: { create: false, read: true, update: false, delete: false },
    expenses: { create: true, read: true, update: true, delete: false },
    lock: { create: true, read: true, update: false, delete: false },
    reports: { read: false },
    users: { create: false, read: false, update: false, delete: false },
    exchange_rates: { read: true },
    audit_logs: { read: false },
    roles: { read: false },
  },
  employee: {
    orders: { create: true, read: true, update: true, delete: true, change_status: false },
    customers: { create: true, read: true, update: true, delete: false },
    payments: { create: true, read: true, update: false, delete: false },
    installments: { create: false, read: true, update: false, delete: false },
    expenses: { create: false, read: false, update: false, delete: false },
    lock: { read: true },
    reports: { read: false },
    users: { create: false, read: false, update: false, delete: false },
    exchange_rates: { read: true },
    audit_logs: { read: false },
    roles: { read: false },
  },
  'data entry': {
    orders: { create: false, read: true, update: false, delete: false, change_status: false },
    customers: { create: false, read: true, update: false, delete: false },
    payments: { create: false, read: true, update: false, delete: false },
    installments: { create: false, read: true, update: false, delete: false },
    expenses: { create: false, read: false, update: false, delete: false },
    lock: { read: false },
    reports: { read: false },
    users: { create: false, read: false, update: false, delete: false },
    exchange_rates: { read: true },
    audit_logs: { read: false },
    roles: { read: false },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customRole, setCustomRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      if (data.is_active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setCustomRole(null);
        return false;
      }
      if (data.role === 'custom' && data.custom_role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('id', data.custom_role_id)
          .maybeSingle();
        setCustomRole(roleData as Role | null);
      } else {
        setCustomRole(null);
      }
      setProfile(data as UserProfile);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      return true;
    }
    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setCustomRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const active = await fetchProfile(data.user.id);
      if (!active) return { error: 'Your account has been deactivated. Please contact an administrator.' };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCustomRole(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!profile) return false;

    if (profile.role === 'custom') {
      if (!customRole) return false;
      const perms = customRole.permissions as Record<string, Record<string, boolean>>;
      return perms?.[module]?.[action] === true;
    }

    const rolePerms = ROLE_PERMISSIONS[profile.role];
    if (!rolePerms) return false;
    return rolePerms[module]?.[action] === true;
  };

  return (
    <AuthContext.Provider value={{ user, profile, customRole, loading, signIn, signOut, refreshProfile, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
