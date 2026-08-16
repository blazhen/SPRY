import PageStub from '@/components/PageStub'
import { stubPages } from '@/data/content'

export default function About() {
  return <PageStub {...stubPages.about} path="/about" />
}
