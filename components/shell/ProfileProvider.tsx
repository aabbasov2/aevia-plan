"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileContextValue = {
  displayName: string;
  loading: boolean;
  saveDisplayName: (name: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue>({
  displayName: "",
  loading: true,
  saveDisplayName: async () => { throw new Error("Profile settings are unavailable."); },
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDisplayName("");
        return;
      }
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setDisplayName((data?.display_name || metadataName || "").trim());
    } catch {
      setDisplayName("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let client: ReturnType<typeof createClient> | null = null;
    let subscription: { unsubscribe: () => void } | undefined;
    void loadProfile();
    try {
      client = createClient();
      const { data } = client.auth.onAuthStateChange(() => {
        window.setTimeout(() => void loadProfile(), 0);
      });
      subscription = data.subscription;
    } catch {
      setLoading(false);
    }
    return () => subscription?.unsubscribe();
  }, [loadProfile]);

  const saveDisplayName = useCallback(async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 80) throw new Error("Enter a name between 1 and 80 characters.");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Sign in again to update your profile.");
    const { error } = await supabase.from("profiles").upsert(
      { id: user.id, display_name: normalizedName },
      { onConflict: "id" },
    );
    if (error) throw new Error("We couldn’t save your name. Please try again.");
    setDisplayName(normalizedName);
  }, []);

  const value = useMemo(() => ({ displayName, loading, saveDisplayName }), [displayName, loading, saveDisplayName]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
