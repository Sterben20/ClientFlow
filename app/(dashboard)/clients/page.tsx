import { getClients } from "./actions"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { ClientList } from "@/components/clients/client-list"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function ClientsPage() {
  const { user, role } = await requireWorkspaceAccess()
  const currentUser = { id: user.id, role }
  const clients = await getClients()

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground mt-2">
            Manage your client relationships and contact information.
          </p>
        </div>
        <ClientFormDialog>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </ClientFormDialog>
      </div>

      <ClientList clients={clients} currentUser={currentUser} />
    </div>
  )
}
