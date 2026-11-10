import type { Metadata } from "next";

import { AuditLogSection } from "@/features/usage/components/AuditLogSection";

export const metadata: Metadata = {
  title: "Auditoria — Administração — SnowQuote",
};

// Os dados são carregados no client (ver `AuditLogSection`), não aqui —
// mesma razão de `admin/usuarios/page.tsx` (Cache Components/Next 16).
export default function AdminAuditLogPage() {
  return <AuditLogSection />;
}
