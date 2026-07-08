import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  Link2,
  Palette,
  QrCode,
  Scissors,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { STOCK_PHOTOS } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: CalendarCheck,
    title: "Agenda sem conflito",
    description:
      "Horários duplicados são bloqueados no banco de dados, mesmo com dois clientes reservando ao mesmo tempo.",
  },
  {
    icon: Smartphone,
    title: "Reserva pelo celular",
    description:
      "Seu cliente escolhe serviço, profissional e horário na sua página — sem baixar aplicativo.",
  },
  {
    icon: QrCode,
    title: "QR Code no balcão",
    description:
      "Gere o QR Code da sua página em um clique e coloque no balcão, no espelho ou no cartão.",
  },
  {
    icon: Palette,
    title: "Sua marca, sua página",
    description:
      "Cores, textos e contato personalizados. No plano Plus, white label completo com upsell de produtos.",
  },
  {
    icon: UsersRound,
    title: "Equipe com papéis",
    description:
      "Gerente, secretária e profissional: cada pessoa vê apenas o que precisa para trabalhar.",
  },
  {
    icon: ShieldCheck,
    title: "Isolamento real",
    description:
      "Cada barbearia em seu próprio espaço, com segurança aplicada linha a linha no banco de dados.",
  },
];

const steps = [
  {
    step: "1",
    title: "Crie sua conta",
    description: "Cadastro gratuito, nome da barbearia e endereço da página.",
  },
  {
    step: "2",
    title: "Monte o catálogo",
    description: "Serviços, preços, profissionais e horários de atendimento.",
  },
  {
    step: "3",
    title: "Divulgue o link",
    description:
      "QR Code no balcão e link no Instagram. As reservas caem direto na sua agenda.",
  },
];

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

        <div className="relative">
          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-white/10 sm:block">
            <Image
              src={STOCK_PHOTOS.barberCut}
              alt="Barbeiro finalizando um corte na cadeira da barbearia"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#11110f] via-transparent to-transparent" />
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#191916]/95 p-6 shadow-2xl backdrop-blur sm:absolute sm:right-0 sm:-bottom-8 sm:w-[85%]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-stone-500">Hoje na agenda</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  12 horários
                </p>
              </div>
              <CalendarCheck className="size-6 text-amber-400" />
            </div>
            <div className="mt-6 space-y-3">
              {[
                ["09:00", "Lucas Martins", "Corte assinatura"],
                ["10:15", "João Alves", "Corte + barba"],
                ["11:30", "André Lima", "Barba clássica"],
              ].map(([time, client, service]) => (
                <div
                  key={time}
                  className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-3.5"
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

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-24">
        <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
          Como funciona
        </p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Do cadastro à primeira reserva em minutos.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7"
            >
              <span className="grid size-9 place-items-center rounded-full bg-amber-500/15 font-mono text-sm font-semibold text-amber-300">
                {item.step}
              </span>
              <h3 className="mt-5 font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl gap-4 px-6 py-6 sm:grid-cols-2">
          {[
            [STOCK_PHOTOS.barberChair, "Cliente sendo atendido na barbearia"],
            [STOCK_PHOTOS.beardTrim, "Acabamento de barba com navalha"],
          ].map(([src, alt]) => (
            <div
              key={src}
              className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 640px) 45vw, 90vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-20 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-white/10 p-6"
          >
            <feature.icon className="size-5 text-amber-400" />
            <h2 className="mt-5 font-medium">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {feature.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[2.5rem] border border-amber-500/25 bg-gradient-to-br from-amber-500/15 to-transparent px-8 py-14 text-center sm:px-16">
          <Link2 className="mx-auto size-6 text-amber-400" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Um link seu, um QR Code no balcão, e a agenda trabalha por você.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-400">
            Comece grátis. Configure em minutos e receba reservas ainda hoje.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-amber-500 text-stone-950 hover:bg-amber-400"
          >
            <Link href="/cadastro">
              Criar minha barbearia <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-stone-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-amber-500 text-stone-950">
              <Scissors className="size-3.5" />
            </span>
            NexoBarber © {new Date().getFullYear()}
          </span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-stone-300">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-stone-300">
              Criar conta
            </Link>
            <Link href="/aurora" className="hover:text-stone-300">
              Demonstração
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
