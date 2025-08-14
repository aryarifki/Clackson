import './globals.css';
import { ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CredentialsSidebar } from '@/components/credentialsSidebar';
import { Github, Instagram, Linkedin, Mail } from 'lucide-react';

export const runtime = 'nodejs';
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="w-full border-b bg-white/60 backdrop-blur flex items-center justify-between px-4 h-12 text-sm relative z-10">
          <div className="font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-400">Veo Prompt Architect</div>
          <div className="hidden sm:flex items-center gap-4">
            <a href="/dashboard" className="underline hover:text-pink-600 transition-colors">History</a>
          </div>
        </div>
        <div className="relative min-h-[calc(100vh-3rem)]">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-white via-blue-50 to-pink-100" />
          <div className="pointer-events-none fixed inset-0 -z-10 [background:radial-gradient(circle_at_30%_20%,rgba(255,0,128,0.12),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,140,255,0.15),transparent_55%)]" />
          {children}
          <CredentialsSidebar />
          <SpeedInsights />
          <footer className="mt-12 py-6 text-center text-xs text-muted-foreground/80 backdrop-blur-sm">
            <div className="flex flex-col gap-2 items-center">
              <span>Built by <span className="font-medium text-pink-600">aryarifki</span></span>
              <span className="text-[10px] uppercase tracking-wider">Next.js · TypeScript · TailwindCSS · Drizzle ORM</span>
              <div className="flex items-center gap-3 mt-1">
                <a href="https://github.com/aryarifki" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="group p-2 rounded-lg border bg-white/70 hover:bg-neutral-900 transition-colors shadow-sm hover:shadow text-neutral-700 hover:text-white">
                  <Github className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="https://instagram.com/rifqiaarya"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram rifqiaarya"
                  className="group p-2 rounded-lg border bg-white/70 hover:bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 transition-colors shadow-sm hover:shadow text-neutral-700 hover:text-white"
                >
                  <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="https://www.linkedin.com/in/ahmad-rifki-aryanto-504aaa307"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="group p-2 rounded-lg border bg-white/70 hover:bg-[#0A66C2] transition-colors shadow-sm hover:shadow text-neutral-700 hover:text-white"
                >
                  <Linkedin className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="mailto:adryanrifky716@gmail.com"
                  aria-label="Email"
                  className="group p-2 rounded-lg border bg-white/70 hover:bg-pink-600 transition-colors shadow-sm hover:shadow text-neutral-700 hover:text-white"
                >
                  <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
