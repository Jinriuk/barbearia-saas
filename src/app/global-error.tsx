"use client";

/**
 * Último recurso: erro no próprio layout raiz. Precisa renderizar <html> e
 * <body> completos porque substitui o documento inteiro; sem imports de UI
 * para não depender de nada que possa ter quebrado.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0c0a09",
          color: "#f5f5f4",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo deu errado por aqui</h1>
          <p style={{ color: "#a8a29e", fontSize: 14, lineHeight: 1.6 }}>
            Já registramos o problema. Tente novamente em instantes — se
            persistir, fale com o suporte informando o código abaixo.
          </p>
          {error.digest ? (
            <p style={{ color: "#78716c", fontSize: 12, fontFamily: "monospace" }}>
              código: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 16px",
              borderRadius: 8,
              border: 0,
              background: "#f59e0b",
              color: "#0c0a09",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
