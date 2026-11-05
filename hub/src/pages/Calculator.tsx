import { PageHead } from '../components/ui'
import { CalculatorBox } from '../components/calculator/CalculatorBox'

/** The calculator as a page: no job yet, so "Add to quote" asks which job first. */
export default function Calculator() {
  return (
    <div className="stack-lg calc-page" data-calc-page>
      <PageHead title="Calculator" subtitle="Add up a price in a few taps." />
      <CalculatorBox />
    </div>
  )
}
