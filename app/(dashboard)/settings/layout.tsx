import Link from "next/link"
import { Users, UserCircle } from "lucide-react"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row">
      <aside className="w-full md:w-64 self-start border-b md:border-r bg-muted/20 p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-4">Settings</h2>
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <Link 
              href="/settings/profile" 
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors shrink-0"
            >
              <UserCircle className="h-4 w-4" />
              Profile
            </Link>
            <Link 
              href="/settings/team" 
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors shrink-0"
            >
              <Users className="h-4 w-4" />
              Team Management
            </Link>
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
