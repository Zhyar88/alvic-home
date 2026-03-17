import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../lib/api";
import type { UserProfile, Role } from "../types";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  customRole: Role | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<
  string,
  Record<string, Record<string, boolean>>
> = {
  administrator: {
    orders: {
      create: true,
      read: true,
      update: true,
      delete: true,
      change_status: true,
    },
    customers: { create: true, read: true, update: true, delete: true },
    payments: {
      create: true,
      read: true,
      update: true,
      delete: true,
      reverse: true,
    },
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
    orders: {
      create: true,
      read: true,
      update: true,
      delete: true,
      change_status: true,
    },
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
    orders: {
      create: true,
      read: true,
      update: true,
      delete: true,
      change_status: false,
    },
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
  "data entry": {
    orders: {
      create: false,
      read: true,
      update: false,
      delete: false,
      change_status: false,
    },
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

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("auth_token");
            setLoading(false);
            return;
          }
          setUser({
            id: payload.id,
            email: payload.email,
            full_name: payload.full_name || "",
            role: payload.role || "employee",
          });
          // Set basic profile from token first
          setProfile({
            id: payload.id,
            user_id: payload.id,
            full_name_en: payload.full_name || "",
            full_name_ku: payload.full_name || "",
            role: payload.role || "employee",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as UserProfile);
          // Then fetch full profile from DB
          try {
            const { supabase } = await import("../lib/database");
            const { data: profileRows } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", payload.id);
            const dbProfile = Array.isArray(profileRows)
              ? profileRows[0]
              : profileRows;
            console.log("dbProfile:", JSON.stringify(dbProfile));
            if (dbProfile) {
              setProfile(dbProfile as UserProfile);
              console.log(
                "role:",
                dbProfile.role,
                "custom_role_id:",
                dbProfile.custom_role_id
              );
              if (dbProfile.role === "custom" && dbProfile.custom_role_id) {
                const { data: roleRows } = await supabase
                  .from("roles")
                  .select("*")
                  .eq("id", dbProfile.custom_role_id);
                const role = Array.isArray(roleRows) ? roleRows[0] : roleRows;
                if (role) setCustomRole(role as Role);
              }
            }
          } catch {}
        } catch (e) {
          localStorage.removeItem("auth_token");
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);

      if (data.user) {
        setUser(data.user);
        // Fetch full profile from DB
        try {
          const { supabase } = await import("../lib/database");
          const { data: profileRows } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", data.user.id);
          const dbProfile = Array.isArray(profileRows)
            ? profileRows[0]
            : profileRows;
          if (dbProfile) {
            setProfile(dbProfile as UserProfile);
            if (dbProfile.role === 'custom' && dbProfile.custom_role_id) {
              const { data: roleRows } = await supabase
                .from('roles')
                .select('*')
                .eq('id', dbProfile.custom_role_id);
              const role = Array.isArray(roleRows) ? roleRows[0] : roleRows;
              if (role) {
                setCustomRole(role as Role);
                setProfile(prev => prev ? ({ ...prev, custom_role_name: role.name_en } as any) : prev);
              }
            }
          } else {
            setProfile({
              id: data.user.id,
              user_id: data.user.id,
              full_name_en: data.user.full_name,
              full_name_ku: data.user.full_name,
              role: data.user.role,
              is_active: data.user.is_active,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserProfile);
          }
        } catch {
          setProfile({
            id: data.user.id,
            user_id: data.user.id,
            full_name_en: data.user.full_name,
            full_name_ku: data.user.full_name,
            role: data.user.role,
            is_active: data.user.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as UserProfile);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || "Login failed" };
    }
  };

  const signOut = async () => {
    authAPI.logout();
    setUser(null);
    setProfile(null);
    setCustomRole(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { supabase } = await import("../lib/database");
      const { data: profileRows } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id);
      const dbProfile = Array.isArray(profileRows)
        ? profileRows[0]
        : profileRows;
      if (dbProfile) {
        setProfile(dbProfile as UserProfile);
        if (dbProfile.role === "custom" && dbProfile.custom_role_id) {
          const { data: roleRows } = await supabase
            .from("roles")
            .select("*")
            .eq("id", dbProfile.custom_role_id);
          const role = Array.isArray(roleRows) ? roleRows[0] : roleRows;
          if (role) {
            setCustomRole(role as Role);
            setProfile((prev) =>
              prev ? ({ ...prev, custom_role_name: role.name_en } as any) : prev
            );
          }
        } else {
          setCustomRole(null);
        }
      }
    } catch {}
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!profile) return false;

    if (profile.role === "custom") {
      if (!customRole) return false;
      const perms = customRole.permissions as Record<
        string,
        Record<string, boolean>
      >;
      return perms?.[module]?.[action] === true;
    }

    const rolePerms = ROLE_PERMISSIONS[profile.role];
    if (!rolePerms) return false;
    return rolePerms[module]?.[action] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        customRole,
        loading,
        signIn,
        signOut,
        refreshProfile,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
