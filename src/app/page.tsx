import Link from "next/link";
import { ArrowRight, CalendarCheck, Scissors, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#11110f] text-stone-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-full bg-amber-500 text-stone-950">
            <Scissors className="size-4" />
          </span>
          NexoBarber
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="text-stone-200 hover:text-stone-950"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button
            asChild
            className="bg-amber-500 text-stone-950 hover:bg-amber-400"
          >
            <Link href="/cadastro">Começar agora</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
        <div className="max-w-3xl">
          <Badge className="mb-6 border-amber-500/30 bg-amber-500/10 text-amber-300">
            Operação simples. Agenda sem conflito.
          </Badge>
          <h1 className="text-5xl font-semibold tracking-[-0.05em] text-balance sm:text-7xl">
            Sua barbearia com ritmo, contexto e controle.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-400">
            Agenda, clientes, equipe e página pública em uma plataforma segura,
            feita para crescer com cada unidade — sem transformar seu balcão em
            uma planilha.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 text-stone-950 hover:bg-amber-400"
            >
              <Link href="/cadastro">
                Criar minha barbearia <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/5"
            >
              <Link href="/aurora">Ver página de demonstração</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="rounded-3xl border border-white/10 bg-[#191916] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-stone-500">Hoje na agenda</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">
                  12 horários
                </p>
              </div>
              <CalendarCheck className="size-6 text-amber-400" />
            </div>
            <div className="mt-8 space-y-3">
              {[
                ["09:00", "Lucas Martins", "Corte assinatura"],
                ["10:15", "João Alves", "Corte + barba"],
                ["11:30", "André Lima", "Barba clássica"],
              ].map(([time, client, service]) => (
                <div
                  key={time}
                  className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-4"
                >
                  <span className="font-mono text-sm text-amber-300">
                    {time}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{client}</p>
                    <p className="text-xs text-stone-500">{service}</p>
                  </div>
                  <span className="ml-auto size-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-20 md:grid-cols-3">
        {[
          [
            ShieldCheck,
            "Isolamento real",
            "RLS e vínculos por barbearia em cada operação.",
          ],
          [
            CalendarCheck,
            "Agenda confiável",
            "Conflitos bloqueados no banco, inclusive em corrida.",
          ],
          [
            Scissors,
            "White label",
            "Sua marca, seus serviços e seu endereço público.",
          ],
        ].map(([Icon, title, description]) => {
          const FeatureIcon = Icon as typeof ShieldCheck;
          return (
            <div
              key={String(title)}
              className="rounded-3xl border border-white/10 p-6"
            >
              <FeatureIcon className="size-5 text-amber-400" />
              <h2 className="mt-5 font-medium">{String(title)}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                {String(description)}
              </p>
            </div>
          );
        })}
      </section>
    </main>
  );
}
