import { redirect } from "next/navigation";

// A antiga aba "Equipe" foi unificada com "Profissionais" (etapa 3). Mantemos a
// rota redirecionando para não quebrar links/atalhos salvos.
export default function UsuariosPage() {
  redirect("/profissionais");
}
