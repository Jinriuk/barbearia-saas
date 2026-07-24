"use client";

import Link from "next/link";
import {
  CreditCard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { signOut } from "@/modules/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  receptionist: "Secretária",
  professional: "Profissional",
  client: "Cliente",
};

export function UserMenu({
  name,
  role,
  canManageSettings,
  isPlatformAdmin = false,
}: {
  name: string;
  role: string;
  canManageSettings: boolean;
  isPlatformAdmin?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-full outline-none focus-visible:ring-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-muted-foreground text-xs">
            {roleLabels[role] ?? role}
          </p>
        </div>
        <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-sm font-semibold">
          {name.slice(0, 1).toUpperCase()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          <p className="text-foreground text-sm font-medium">{name}</p>
          <p className="text-muted-foreground text-xs">
            {roleLabels[role] ?? role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/minha-conta">
            <UserCog /> Minha conta
          </Link>
        </DropdownMenuItem>
        {canManageSettings ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <Settings /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/assinatura">
                <CreditCard /> Assinatura
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {isPlatformAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Plataforma (super-admin)
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem
            variant="destructive"
            asChild
            onSelect={(event) => event.preventDefault()}
          >
            <button type="submit" className="w-full">
              <LogOut /> Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
