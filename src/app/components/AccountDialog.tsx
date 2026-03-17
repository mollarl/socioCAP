"use client";

import { useMemo, useState } from "react";
import type { UserRole } from "@/lib/auth/authorization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface AccountDialogProps {
  email: string;
  role: UserRole;
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  onSignOut: () => Promise<void>;
}

type ApiResponse = {
  ok?: boolean;
  message?: string;
  user?: {
    email?: string;
    role?: string;
  };
};

const PASSWORD_MIN = 8;

export function AccountDialog({
  email,
  role,
  isOpen,
  onOpenChange,
  onSignOut,
}: AccountDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatNewPassword, setRepeatNewPassword] = useState("");
  const [changePasswordMsg, setChangePasswordMsg] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [repeatNewUserPassword, setRepeatNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(role);
  const [createUserMsg, setCreateUserMsg] = useState("");
  const [createUserError, setCreateUserError] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin = role === "admin";
  const effectiveRoleForCreate = isAdmin ? newUserRole : role;

  const roleLabel = useMemo(() => role.toUpperCase(), [role]);

  const resetMessages = () => {
    setChangePasswordMsg("");
    setChangePasswordError("");
    setCreateUserMsg("");
    setCreateUserError("");
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!currentPassword || !newPassword || !repeatNewPassword) {
      setChangePasswordError("Complete todos los campos de contraseña.");
      return;
    }

    if (newPassword.length < PASSWORD_MIN) {
      setChangePasswordError(
        `La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
      );
      return;
    }

    if (newPassword !== repeatNewPassword) {
      setChangePasswordError("La nueva contraseña no coincide.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { authClient } = await import("@/lib/auth/client");
      const response = await authClient.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.error) {
        throw new Error(
          response.error.message || "No se pudo actualizar la contraseña.",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setRepeatNewPassword("");
      setChangePasswordMsg("Contraseña actualizada correctamente.");
    } catch (error) {
      setChangePasswordError(
        error instanceof Error
          ? error.message
          : "Error inesperado al actualizar contraseña.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!newUserEmail || !newUserPassword || !repeatNewUserPassword) {
      setCreateUserError("Complete email y contraseña del nuevo usuario.");
      return;
    }

    if (newUserPassword.length < PASSWORD_MIN) {
      setCreateUserError(
        `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
      );
      return;
    }

    if (newUserPassword !== repeatNewUserPassword) {
      setCreateUserError("La contraseña del nuevo usuario no coincide.");
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          name: newUserName.trim() || undefined,
          password: newUserPassword,
          role: effectiveRoleForCreate,
        }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "No se pudo crear el usuario.");
      }

      setCreateUserMsg(
        `Usuario ${payload.user?.email || newUserEmail.trim()} creado con rol ${payload.user?.role || effectiveRoleForCreate}.`,
      );
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setRepeatNewUserPassword("");
      if (isAdmin) setNewUserRole("cap");
    } catch (error) {
      setCreateUserError(
        error instanceof Error
          ? error.message
          : "Error inesperado al crear usuario.",
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!isChangingPassword && !isCreatingUser && !isSigningOut) {
          onOpenChange(next);
          if (!next) resetMessages();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
          <DialogDescription>
            {email} ({roleLabel})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Cambiar contraseña</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña actual"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="current-password"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Repetir nueva contraseña"
                value={repeatNewPassword}
                onChange={(event) => setRepeatNewPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="new-password"
                required
              />
              <button
                type="submit"
                disabled={isChangingPassword || isCreatingUser || isSigningOut}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-yellow-900 font-medium disabled:opacity-60"
              >
                {isChangingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
              {changePasswordError && (
                <p className="text-sm text-red-600">{changePasswordError}</p>
              )}
              {changePasswordMsg && (
                <p className="text-sm text-green-700">{changePasswordMsg}</p>
              )}
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Crear usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre (opcional)"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Repetir contraseña"
                value={repeatNewUserPassword}
                onChange={(event) =>
                  setRepeatNewUserPassword(event.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                autoComplete="new-password"
                required
              />

              {isAdmin ? (
                <select
                  value={newUserRole}
                  onChange={(event) =>
                    setNewUserRole(event.target.value as UserRole)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                >
                  <option value="admin">admin</option>
                  <option value="cap">cap</option>
                  <option value="cre">cre</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              )}

              <button
                type="submit"
                disabled={isCreatingUser || isChangingPassword || isSigningOut}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium disabled:opacity-60"
              >
                {isCreatingUser ? "Creando..." : "Crear usuario"}
              </button>

              {createUserError && (
                <p className="text-sm text-red-600">{createUserError}</p>
              )}
              {createUserMsg && (
                <p className="text-sm text-green-700">{createUserMsg}</p>
              )}
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <button
              type="button"
              onClick={handleSignOutClick}
              disabled={isSigningOut || isChangingPassword || isCreatingUser}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-60"
            >
              {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
