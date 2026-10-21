import { Shell } from './components/Shell'
import { Toaster } from './components/ui'
import { useRoute } from './lib/router'
import CustomerView from './pages/CustomerView'
import EditorPage from './pages/Editor'
import QuoteList from './pages/QuoteList'
import TemplatesPage from './pages/Templates'

export default function App() {
  const route = useRoute()

  // The customer page is chromeless: no staff navigation.
  if (route.name === 'view') {
    return (
      <>
        <CustomerView id={route.id} />
        <Toaster />
      </>
    )
  }

  return (
    <Shell route={route}>
      {route.name === 'list' && <QuoteList />}
      {(route.name === 'new' || route.name === 'edit') && (
        // The key makes the editor start fresh for each quote.
        <EditorPage key={route.name === 'edit' ? route.id : 'new:' + route.nonce} route={route} />
      )}
      {route.name === 'templates' && <TemplatesPage />}
      <Toaster />
    </Shell>
  )
}
