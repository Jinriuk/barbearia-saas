// Layout mínimo para páginas de impressão (relatórios em PDF), fora do painel.
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-neutral-900">{children}</div>;
}
