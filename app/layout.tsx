
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Short Editor',
  description: 'Trim Shorts, remove CTAs, add your own overlays',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
