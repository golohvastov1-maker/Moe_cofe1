import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "./types";

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

export const SYNC_ID = "shared";
export const SYNC_TABLE = "app_state";

interface RemoteRow {
  id: string;
  payload: AppState | string;
  updated_at: string;
}

function getEnvValue(name: string) {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name];
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = getEnvValue("VITE_SUPABASE_URL");
  const key = getEnvValue("VITE_SUPABASE_ANON_KEY");

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function loadRemoteSnapshot(): Promise<{ state: AppState; updatedAt: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from(SYNC_TABLE)
      .select("payload, updated_at")
      .eq("id", SYNC_ID)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST116") {
        throw error;
      }
      return null;
    }

    if (!data) return null;

    const payload = typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload;
    return {
      state: payload as AppState,
      updatedAt: String(data.updated_at ?? new Date().toISOString()),
    };
  } catch (error) {
    console.error("Не удалось загрузить данные из Supabase.", error);
    return null;
  }
}

export async function saveRemoteSnapshot(state: AppState): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const payload = JSON.stringify(state);
    const updatedAt = new Date().toISOString();

    const { error } = await client
      .from(SYNC_TABLE)
      .upsert(
        {
          id: SYNC_ID,
          payload,
          updated_at: updatedAt,
        },
        { onConflict: "id" },
      );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Не удалось синхронизировать состояние с Supabase.", error);
    window.dispatchEvent(new CustomEvent("moe-cafe-sync-error", { detail: { message: "Синхронизация с облаком недоступна." } }));
  }
}

export function getRemoteSyncEnabled(): boolean {
  return Boolean(getEnvValue("VITE_SUPABASE_URL") && getEnvValue("VITE_SUPABASE_ANON_KEY"));
}
