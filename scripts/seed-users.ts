/**
 * Seed de usuários de teste (consultor/admin) via Admin API do Supabase Auth.
 *
 * Inserir usuários direto em `auth.users` via SQL não é suportado: faltam
 * campos internos do GoTrue (tokens, versões de schema) que não são óbvios
 * via SQL e causam erro 500 ("Database error querying schema") no login.
 * A Admin API é o único caminho confiável para criar usuários fora do fluxo
 * normal de signup.
 *
 * Uso: npx tsx scripts/seed-users.ts
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.");
  process.exit(1);
}

const SEED_PASSWORD = "senha123456";

const SEED_USERS = [
  { email: "consultor@tripquote.dev", fullName: "Consultor Teste", role: "consultant" as const },
  { email: "admin@tripquote.dev", fullName: "Admin Teste", role: "admin" as const },
];

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const seedUser of SEED_USERS) {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email === seedUser.email);

    const userId = found
      ? found.id
      : await (async () => {
          const { data, error } = await admin.auth.admin.createUser({
            email: seedUser.email,
            password: SEED_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: seedUser.fullName },
          });
          if (error || !data.user) {
            throw new Error(`Falha ao criar ${seedUser.email}: ${error?.message}`);
          }
          console.log(`Criado: ${seedUser.email}`);
          return data.user.id;
        })();

    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: seedUser.fullName, role: seedUser.role })
      .eq("id", userId);

    if (profileError) {
      throw new Error(`Falha ao atualizar profile de ${seedUser.email}: ${profileError.message}`);
    }

    console.log(`Profile atualizado: ${seedUser.email} (${seedUser.role})`);
  }

  console.log("\nSeed concluído. Senha de todos os usuários de teste: " + SEED_PASSWORD);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
