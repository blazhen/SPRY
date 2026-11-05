import './frame.css'
import { Shell } from './components/Shell'
import { Toaster } from './components/ui'
import { useRoute } from './lib/router'
import ContactDetail from './pages/ContactDetail'
import Contacts from './pages/Contacts'
import CustomerView from './pages/CustomerView'
import Editor from './pages/Editor'
import InvoiceDetail from './pages/InvoiceDetail'
import InvoiceEdit from './pages/InvoiceEdit'
import Invoices from './pages/Invoices'
import JobDetail from './pages/JobDetail'
import Jobs from './pages/Jobs'
import PriceBook from './pages/PriceBook'
import QuoteList from './pages/QuoteList'
import Settings from './pages/Settings'
import FoamPrices from './pages/FoamPrices'
import Calculator from './pages/Calculator'
import Templates from './pages/Templates'
import Terms from './pages/Terms'
import Todo from './pages/Todo'
import Week from './pages/Week'
import Calendar from './pages/Calendar'
import Enquiry from './pages/Enquiry'
import DaySheet from './pages/DaySheet'

export default function App() {
  const route = useRoute()

  // The customer page is chromeless: no staff navigation.
  if (route.name === 'view') {
    return (
      <>
        <CustomerView />
        <Toaster />
      </>
    )
  }

  return (
    <Shell route={route}>
      {route.name === 'todo' && <Todo />}
      {route.name === 'jobs' && <Jobs />}
      {route.name === 'job' && <JobDetail key={route.id} />}
      {route.name === 'quotes' && <QuoteList />}
      {/* The key makes the editor start fresh for each quote. */}
      {route.name === 'edit' && <Editor key={route.id} />}
      {route.name === 'invoices' && <Invoices />}
      {route.name === 'invoice' && <InvoiceDetail key={route.id} />}
      {route.name === 'invoiceEdit' && <InvoiceEdit key={route.id} />}
      {route.name === 'invoiceNew' && <InvoiceEdit key={`new-${route.jobId ?? ''}`} />}
      {route.name === 'contacts' && <Contacts />}
      {route.name === 'contact' && <ContactDetail key={route.id} />}
      {route.name === 'templates' && <Templates />}
      {route.name === 'terms' && <Terms />}
      {route.name === 'prices' && <PriceBook />}
      {route.name === 'week' && <Week />}
      {route.name === 'calendar' && <Calendar />}
      {route.name === 'enquiry' && <Enquiry />}
      {route.name === 'daysheet' && <DaySheet />}
      {route.name === 'settings' && <Settings />}
      {route.name === 'foam' && <FoamPrices />}
      {route.name === 'calculator' && <Calculator />}
      <Toaster />
    </Shell>
  )
}
