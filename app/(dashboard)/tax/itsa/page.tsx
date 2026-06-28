// Server component — thin shell. Data fetching is handled client-side in
// ItsaObligationsView so that browser fraud prevention context (_fp) is
// collected and sent with the HMRC request on every call.

import ItsaObligationsView from './itsa-obligations-view'

export const dynamic = 'force-dynamic'

export default function ItsaObligationsPage() {
  return <ItsaObligationsView />
}
