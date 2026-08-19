import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricCardProps {
  title: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
  valueClassName?: string
  className?: string
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  valueClassName, 
  className 
}: MetricCardProps) {
  return (
    <Card className={cn("min-w-0 flex flex-col justify-between h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="flex justify-center">
        <div className={cn("text-xl 2xl:text-2xl font-bold whitespace-nowrap tracking-tight text-center", valueClassName)}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
