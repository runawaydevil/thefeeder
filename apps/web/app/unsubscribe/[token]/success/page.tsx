import { redirect } from "next/navigation";

interface UnsubscribeSuccessPageProps {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribeSuccessPage({ params }: UnsubscribeSuccessPageProps) {
  const { token } = await params;

  // Verify token exists - check if any subscriber was unsubscribed with this token
  // We don't need to verify exactly which one, just show success if token format is valid
  // The actual validation happened in the API route
  if (!token || token.length !== 64) {
    redirect("/");
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines" style={{ background: 'var(--color-bg-primary)', transition: 'var(--theme-transition)' }}>
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'var(--gradient-bg-overlay)',
        transition: 'var(--theme-transition)'
      }} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="glow-soft mb-6">
            <img src="/logo.png" alt="The Feeder Logo" className="w-20 h-20 mx-auto" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-glow-pink mb-4">
            DESINSCRIÇÃO CONFIRMADA
          </h1>

          {/* Message */}
          <div className="bg-card border-2 rounded-lg p-6 mb-6" style={{
            borderColor: 'var(--color-accent-secondary)',
            boxShadow: 'var(--shadow-card)',
            transition: 'var(--theme-transition)'
          }}>
            <p className="text-foreground mb-4">
              Você foi removido da lista de emails com sucesso.
            </p>
            <p className="text-muted-foreground text-sm">
              Você não receberá mais emails do TheFeeder. Se mudar de ideia, você pode se inscrever novamente a qualquer momento.
            </p>
          </div>

          {/* Link back */}
          <a
            href="/"
            className="inline-block px-6 py-3 font-bold rounded-lg hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: 'var(--color-accent-primary)',
              color: 'var(--color-bg-primary)',
              textShadow: 'var(--shadow-glow)',
              boxShadow: 'var(--shadow-glow)',
              transition: 'var(--theme-transition)'
            }}
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}

