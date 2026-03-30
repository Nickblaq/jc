
import type { Metadata } from 'next'
import './globals.css'
// import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');



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
