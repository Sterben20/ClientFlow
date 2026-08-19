import Link from "next/link"
import { Building2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-8">
        
        {/* Logo/Brand */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="h-8 w-8" />
            <span className="font-bold text-2xl tracking-tight text-foreground">ClientFlow</span>
          </div>
        </div>

        {/* 404 Content */}
        <div className="space-y-4">
          <h1 className="text-8xl font-black text-muted-foreground/20">404</h1>
          <h2 className="text-2xl font-bold tracking-tight">Page not found</h2>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/clients">
              View Clients
            </Link>
          </Button>
        </div>

        {/* Optional Go Back */}
        <div className="pt-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Home
          </Link>
        </div>

      </div>
    </div>
  )
}
