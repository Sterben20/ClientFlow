import { getDeals, getClientsForDeals, getWorkspaceMembers } from "./actions"
import { DealsClientView } from "@/components/deals/deals-client-view"
import { requireWorkspaceAccess } from "@/lib/workspace"

export default async function DealsPage() {
  const access = await requireWorkspaceAccess()
  const deals = await getDeals()
  const clients = await getClientsForDeals()
  const members = await getWorkspaceMembers()

  const currentUser = {
    id: access.user.id,
    role: access.role
  }

  return (
    <div className="p-4 lg:p-8">
      <DealsClientView 
        initialDeals={deals} 
        clients={clients} 
        members={members}
        currentUser={currentUser}
      />
    </div>
  )
}
