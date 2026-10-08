import "server-only";

import { z } from "zod";

/** Espelha a linha de `profiles`, exposta à UI admin. */
export const userRecordSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string().nullable(),
  role: z.enum(["consultant", "admin"]),
  active: z.boolean(),
  createdAt: z.string(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;

export const inviteUserInputSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  fullName: z.string().trim().min(1, "Informe o nome completo.").max(200),
  role: z.enum(["consultant", "admin"]),
});

export type InviteUserInput = z.infer<typeof inviteUserInputSchema>;

export const updateUserRoleInputSchema = z.object({
  userId: z.string(),
  role: z.enum(["consultant", "admin"]),
});

export const setUserActiveInputSchema = z.object({
  userId: z.string(),
  active: z.boolean(),
});
