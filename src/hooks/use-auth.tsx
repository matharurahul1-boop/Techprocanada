import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  status: "loading" | "signed-in" | "signed-out";
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "signed-in" | "signed-out">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "signed-out");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "signed-in" : "signed-out");
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signInWithPassword: AuthContextValue["signInWithPassword"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: appUser } = await supabase
      .from("app_users")
      .select("is_active")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (appUser && !appUser.is_active) {
      await supabase.auth.signOut();
      return { error: "This account has been deactivated. Contact an admin for access." };
    }

    return { error: null };
  };

  const signUpWithPassword: AuthContextValue["signUpWithPassword"] = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && !data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, status, signInWithPassword, signUpWithPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
