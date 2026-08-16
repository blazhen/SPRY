import PageStub from '@/components/PageStub'
import { stubPages } from '@/data/content'

export default function Commercial() {
  return <PageStub {...stubPages.commercial} path="/commercial" />
}
