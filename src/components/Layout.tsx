import { Outlet } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import IntroCurtain from '@/components/IntroCurtain'
import ThemeSwitcher from '@/components/ThemeSwitcher'

/** Shared chrome for every route: skip link, header, main landmark, footer. */
export default function Layout() {
  return (
    <>
      {/* No-ops unless INTRO_CURTAIN is enabled in src/config.ts. */}
      <IntroCurtain />

      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Header />

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />

      {/* Review tool for comparing the two palettes. Delete this one line and
          the ThemeSwitcher import to ship a single palette. */}
      <ThemeSwitcher />
    </>
  )
}
