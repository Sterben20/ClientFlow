"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export function DashboardChart({ data }: { data: Record<string, string | number>[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center border-t">
        <p className="text-sm text-muted-foreground">No deals to display yet.</p>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 1000000000) return `Rp${(value / 1000000000).toLocaleString('en-US', {maximumFractionDigits: 1})}B`
            if (value >= 1000000) return `Rp${(value / 1000000).toLocaleString('en-US', {maximumFractionDigits: 1})}M`
            if (value >= 1000) return `Rp${(value / 1000).toLocaleString('en-US', {maximumFractionDigits: 1})}K`
            return `Rp${value}`
          }}
        />
        <Tooltip 
          cursor={{fill: 'hsl(var(--muted))'}}
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))'
          }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: unknown) => [formatCurrency(Number(value) || 0), "Deal Value"]}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  )
}
