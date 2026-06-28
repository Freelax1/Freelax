// Server component — thin shell. Data fetching is handled client-side in
// VatObligationsView so that browser fraud prevention context (_fp) is
// collected and sent with the HMRC request on every call.

import VatObligationsView from './vat-obligations-view'

export const dynamic = 'force-dynamic'

export default function VatObligationsPage() {
  return <VatObligationsView />
}
