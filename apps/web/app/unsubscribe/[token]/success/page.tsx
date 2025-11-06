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
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines">
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 0%, hsl(320 100% 50% / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, hsl(270 100% 50% / 0.3), transparent 50%)'
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
          <div className="bg-card border-2 border-vaporwave-cyan rounded-lg p-6 mb-6" style={{
            boxShadow: '0 0 20px hsla(180, 100%, 60%, 0.5), 0 0 40px hsla(270, 100%, 70%, 0.3)'
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
            className="inline-block px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
            style={{
              textShadow: '0 0 8px rgba(255, 0, 110, 0.5)',
              boxShadow: '0 0 15px hsl(320 100% 65%)'
            }}
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}

