/**
 * Credenciais dos usuários seed (`npm run db:seed` / `scripts/seed-users.ts`).
 * Usados apenas em ambiente de teste — nunca aponte este arquivo para
 * credenciais de produção.
 */
export const SEED_PASSWORD = "senha123456";

export const CONSULTANT_USER = {
  email: "consultor@tripquote.dev",
  password: SEED_PASSWORD,
};

export const ADMIN_USER = {
  email: "admin@tripquote.dev",
  password: SEED_PASSWORD,
};
