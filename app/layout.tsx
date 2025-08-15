import './globals.css';
import { ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CredentialsSidebar } from '@/components/credentialsSidebar';
import { Github, Instagram, Linkedin, Mail } from 'lucide-react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const runtime = 'nodejs';
import NextAuthSessionProvider from '@/components/session-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <NextAuthSessionProvider>
          <div className="w-full border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 h-14 text-sm relative z-10">
            <div className="font-semibold tracking-tight text-primary">
              Clackson
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <a href="/dashboard" className="hover:text-primary/80 transition-colors">History</a>
            </div>
          </div>
          <div className="relative min-h-[calc(100vh-3.5rem)]">
            <main className="container mx-auto py-8">
              {children}
            </main>
            <CredentialsSidebar />
            <SpeedInsights />
            <footer className="mt-12 py-6 text-center text-xs text-muted-foreground/80">
              <div className="flex flex-col gap-3 items-center">
                <span>Built by <span className="font-medium text-primary">aryarifki</span></span>
                <span className="text-[10px] uppercase tracking-wider">Next.js · TypeScript · TailwindCSS · Drizzle ORM</span>
                <div className="flex items-center gap-3 mt-2">
                  <a href="https://github.com/aryarifki" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="group p-2 rounded-lg border border-border bg-secondary hover:bg-accent transition-colors shadow-sm text-foreground">
                    <Github className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="https://instagram.com/rifqiaarya"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram rifqiaarya"
                    className="group p-2 rounded-lg border border-border bg-secondary hover:bg-accent transition-colors shadow-sm text-foreground"
                  >
                    <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ahmad-rifki-aryanto-504aaa307"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="group p-2 rounded-lg border border-border bg-secondary hover:bg-accent transition-colors shadow-sm text-foreground"
                  >
                    <Linkedin className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="mailto:adryanrifky716@gmail.com"
                    aria-label="Email"
                    className="group p-2 rounded-lg border border-border bg-secondary hover:bg-accent transition-colors shadow-sm text-foreground"
                  >
                    <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}