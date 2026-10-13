import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Painel de Gestão | Agendamento e Transporte | MODEC MRO',
  description: 'Sistema Online de Gestão de Agendamento, Transporte e Controle de SLA para a frota MODEC / MRO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-mro-bg">{children}</body>
    </html>
  );
}
