import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "./types";

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

export const SYNC_ID = "shared";
export const SYNC_TABLE = "app_state";

export interface RemoteSnapshot {
  state: AppState;
  updatedAt: string;
}

let supabaseClient: SupabaseClient | null = null;

function getEnvValue(name: string) {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name];
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = getEnvValue("VITE_SUPABASE_URL");
  const key = getEnvValue("VITE_SUPABASE_ANON_KEY");

  if (!url || !key) return null;
  if (supabaseClient) return supabaseClient;

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return supabaseClient;
}

export async function loadRemoteSnapshot(): Promise<RemoteSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from(SYNC_TABLE)
    .select("payload, updated_at")
    .eq("id", SYNC_ID)
    .maybeSingle();

  if (error) {
    window.dispatchEvent(new CustomEvent("moe-cafe-sync-error", { detail: { message: "Не удалось загрузить данные из облака." } }));
    throw error;
  }

  if (!data) return null;

  const payload = typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload;
  return {
    state: payload as AppState,
    updatedAt: String(data.updated_at ?? ""),
  };
}

export async function saveRemoteSnapshot(state: AppState): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Синхронизация с Supabase не настроена.");

  const { data, error } = await client
    .from(SYNC_TABLE)
    .upsert(
      {
        id: SYNC_ID,
        payload: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    throw error;
  }

  return String(data.updated_at);
}

export function getRemoteSyncEnabled(): boolean {
  return Boolean(getEnvValue("VITE_SUPABASE_URL") && getEnvValue("VITE_SUPABASE_ANON_KEY"));
}
