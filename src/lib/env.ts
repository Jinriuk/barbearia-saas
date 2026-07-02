const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getPublicSupabaseEnv() {
  if (!publicUrl || !publicAnonKey) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env.local e preencha as chaves.",
    );
  }

  return { url: publicUrl, anonKey: publicAnonKey };
}
