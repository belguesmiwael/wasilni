import { Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata = {
  title: 'وصلّني — Waselni | Covoiturage sécurisé en Tunisie',
  description: 'Le premier covoiturage vérifié entre gouvernorats tunisiens. Conducteurs certifiés, paiement escrow, SOS en temps réel.',
  manifest: '/manifest.json',
  themeColor: '#00C9B1',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={sora.variable}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  )
}
