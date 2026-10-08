import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { userRecordSchema, type UserRecord } from "@/features/users/schemas/user.schema";

/** Lista todos os usuários (`profiles`), mais recentes primeiro. */
export async function listUsers(supabase: SupabaseClient<Database>): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar os usuários: ${error.message}`);
  }

  return data.map((row) =>
    userRecordSchema.parse({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      active: row.active,
      createdAt: row.created_at,
    }),
  );
}
