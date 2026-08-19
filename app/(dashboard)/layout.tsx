import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/workspaces");
  }
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <MobileNav>
            <Sidebar className="flex w-full h-full border-r-0" />
          </MobileNav>
          <div className="w-full flex-1">
            {/* The title can be managed locally by pages or we can just leave it clean */}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
