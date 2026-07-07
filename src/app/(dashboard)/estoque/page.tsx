import { redirect } from "next/navigation";

// Estoque foi unificado com a página de Produtos ("Produtos e Estoque").
export default function InventoryPage() {
  redirect("/produtos");
}
