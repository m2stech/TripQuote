"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteUserAction,
  listUsersAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/features/users/actions/user-actions";
import type { UserRecord } from "@/features/users/schemas/user.schema";

const ROLE_LABELS: Record<UserRecord["role"], string> = {
  admin: "Admin",
  consultant: "Consultor",
};

const EMPTY_INVITE_FORM = {
  fullName: "",
  email: "",
  role: "consultant" as UserRecord["role"],
};

/**
 * Tela de gestão de usuários (M8): lista com badges de papel/status, convite
 * por e-mail, alternância de papel e ativação/desativação — tudo via Server
 * Actions já protegidas por `requireAdmin()`. A lista é carregada no client
 * (como `QuoteListScreen`), não no Server Component da página: isso evita
 * que o Next (Cache Components) tente pré-renderizar uma página que depende
 * de autenticação/cookies de sessão.
 */
export function UserManagementScreen() {
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE_FORM);
  const [isInviting, setIsInviting] = useState(false);

  const [pendingDeactivation, setPendingDeactivation] = useState<UserRecord | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [togglingRoleUserId, setTogglingRoleUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUsersAction();
      setUsers(result);
    } catch {
      setError("Não foi possível carregar a lista de usuários.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updated = await listUsersAction();
      setUsers(updated);
    } catch {
      toast.error("Não foi possível atualizar a lista de usuários.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  async function handleInviteSubmit() {
    setIsInviting(true);
    try {
      await inviteUserAction(inviteForm);
      toast.success("Convite enviado com sucesso.");
      setIsInviteDialogOpen(false);
      setInviteForm(EMPTY_INVITE_FORM);
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível convidar o usuário.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleToggleRole(user: UserRecord) {
    const nextRole: UserRecord["role"] = user.role === "admin" ? "consultant" : "admin";
    setTogglingRoleUserId(user.id);
    try {
      await updateUserRoleAction({ userId: user.id, role: nextRole });
      toast.success(
        `Papel de ${user.fullName ?? user.email} alterado para ${ROLE_LABELS[nextRole]}.`,
      );
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o papel.");
    } finally {
      setTogglingRoleUserId(null);
    }
  }

  async function handleActivate(user: UserRecord) {
    setIsTogglingActive(true);
    try {
      await setUserActiveAction({ userId: user.id, active: true });
      toast.success(`${user.fullName ?? user.email} foi reativado.`);
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reativar o usuário.");
    } finally {
      setIsTogglingActive(false);
    }
  }

  async function handleConfirmDeactivation() {
    if (!pendingDeactivation) return;
    setIsTogglingActive(true);
    try {
      await setUserActiveAction({ userId: pendingDeactivation.id, active: false });
      toast.success(`${pendingDeactivation.fullName ?? pendingDeactivation.email} foi desativado.`);
      setPendingDeactivation(null);
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desativar o usuário.");
    } finally {
      setIsTogglingActive(false);
    }
  }

  return (
    <SectionCard
      number={1}
      title="Usuários"
      description="Convide, ative/desative e defina o papel (consultor ou admin) de cada usuário."
    >
      <div className="flex justify-end">
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="snow-generate" size="generate">
                Convidar usuário
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar usuário</DialogTitle>
              <DialogDescription>
                Um e-mail de convite nativo do Supabase será enviado para o endereço informado.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-full-name">Nome completo</Label>
                <Input
                  id="invite-full-name"
                  value={inviteForm.fullName}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="Ex.: Maria Silva"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="nome@agencia.com.br"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-role">Papel</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) =>
                    setInviteForm((prev) => ({ ...prev, role: value as UserRecord["role"] }))
                  }
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">Consultor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="snow-secondary">Cancelar</Button>} />
              <Button
                type="button"
                variant="snow-generate"
                disabled={isInviting || !inviteForm.email || !inviteForm.fullName}
                onClick={() => void handleInviteSubmit()}
              >
                {isInviting ? "Enviando…" : "Enviar convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <LoadingState label="Carregando usuários…" /> : null}

      {!isLoading && error ? (
        <ErrorState description={error} onRetry={() => void loadUsers()} />
      ) : null}

      {!isLoading && !error && users && users.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Convide o primeiro usuário para começar a usar o TripQuote."
        />
      ) : null}

      {!isLoading && !error && users && users.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-busy={isRefreshing}>
          {users.map((user) => (
            <li
              key={user.id}
              className="rounded-snow-card border-border bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground truncate font-semibold">
                    {user.fullName ?? user.email}
                  </p>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  <Badge
                    className={
                      user.active
                        ? "bg-snow-secondary-bg text-snow-secondary-fg border-0"
                        : "bg-snow-remove-bg text-snow-remove-fg border-0"
                    }
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-muted-foreground truncate text-sm">{user.email}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={togglingRoleUserId === user.id}
                  onClick={() => void handleToggleRole(user)}
                >
                  {togglingRoleUserId === user.id
                    ? "Alterando…"
                    : user.role === "admin"
                      ? "Tornar consultor"
                      : "Tornar admin"}
                </Button>

                {user.active ? (
                  <Dialog
                    open={pendingDeactivation?.id === user.id}
                    onOpenChange={(open) => setPendingDeactivation(open ? user : null)}
                  >
                    <DialogTrigger
                      render={
                        <Button type="button" variant="snow-remove" size="sm">
                          Desativar
                        </Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Desativar usuário</DialogTitle>
                        <DialogDescription>
                          {user.fullName ?? user.email} perderá acesso ao TripQuote imediatamente.
                          Deseja continuar?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose render={<Button variant="snow-secondary">Cancelar</Button>} />
                        <Button
                          type="button"
                          variant="snow-remove"
                          disabled={isTogglingActive}
                          onClick={() => void handleConfirmDeactivation()}
                        >
                          {isTogglingActive ? "Desativando…" : "Desativar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button
                    type="button"
                    variant="snow-secondary"
                    size="sm"
                    disabled={isTogglingActive}
                    onClick={() => void handleActivate(user)}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
