import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-primary font-mono text-sm">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground mt-2">
          O endereço pode ter mudado ou a barbearia não está publicada.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
