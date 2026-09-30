
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuration serveur Supabase incomplète." }, 500);
  }

  const token = authHeader.replace("Bearer ", "");
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user: requester }, error: requesterError } = await authClient.auth.getUser(token);
  if (requesterError || !requester) return json({ error: "Session invalide ou expirée." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role,active")
    .eq("id", requester.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.active !== true) {
    return json({ error: "Seul un administrateur actif peut créer un compte employé." }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Données JSON invalides." }, 400); }

  const full_name = String(body?.full_name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const phone = String(body?.phone || "").trim();

  if (!full_name || !email || !password) return json({ error: "Nom, e-mail et mot de passe sont obligatoires." }, 400);
  if (password.length < 8) return json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  });

  if (createError || !created.user) {
    const message = createError?.message || "Impossible de créer le compte.";
    return json({ error: message }, 400);
  }

  const userId = created.user.id;
  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({ full_name, phone, role: "employee", active: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileUpdateError) {
    await adminClient.auth.admin.deleteUser(userId);
    return json({ error: "Le compte a été créé mais son profil n’a pas pu être finalisé." }, 500);
  }

  return json({ success: true, user: { id: userId, email, full_name, role: "employee" } });
});
