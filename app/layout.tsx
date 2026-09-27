import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WeatherTrust | Explainable AWS Anomaly Detection',
  description: 'Explainable Automatic Weather Station (AWS) anomaly detection and dynamic trust score dashboard for MOSDAC telemetry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
