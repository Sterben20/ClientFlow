import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Briefcase, 
  FolderKanban, 
  CheckSquare,
  Plus
} from "lucide-react";
import Link from "next/link";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { getSummaryCounts, getChartData, getRecentActivity } from "./actions";
import { ActivityTimelineClient } from "@/components/activity/activity-timeline-client";

// --- Subcomponents for Streaming ---

async function SummaryCards() {
  const summary = await getSummaryCounts();
  return (
    <>
      <MetricCard
        title="Total Clients"
        icon={<Users className="h-4 w-4" />}
        value={summary.totalClients}
      />
      <MetricCard
        title="Active Projects"
        icon={<Briefcase className="h-4 w-4" />}
        value={summary.activeProjects}
      />
      <MetricCard
        title="Deals in Pipeline"
        icon={<FolderKanban className="h-4 w-4" />}
        value={summary.pipelineDeals}
      />
      <MetricCard
        title="Active Tasks"
        icon={<CheckSquare className="h-4 w-4" />}
        value={summary.dueTasks}
      />
      <MetricCard
        title="Total Deal Value"
        icon={<FolderKanban className="h-4 w-4" />}
        value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summary.totalDealValue)}
      />
    </>
  );
}

function SummaryCardsSkeleton() {
  return (
    <>
      {Array(5).fill(0).map((_, i) => (
        <Card key={i} className="min-w-0 flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent className="flex justify-center">
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

async function ChartSection() {
  const chartData = await getChartData();
  return <DashboardChart data={chartData} />;
}

async function ActivitySection() {
  const latestActivity = await getRecentActivity(1);
  return (
    <ActivityTimelineClient 
      initialActivities={latestActivity} 
      contextType="dashboard" 
      availableFilters={[]} 
    />
  );
}

// --- Main Page Component ---

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">Create your first client to get started. Once you have clients, you can create deals, projects, and tasks for them. To start, let&apos;s go to the Clients page.</p>
        </div>
        <Link href="/projects">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Suspense fallback={<SummaryCardsSkeleton />}>
          <SummaryCards />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Deals</CardTitle>
            <CardDescription>Your highest value deals across the pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Suspense fallback={<Skeleton className="h-[350px] w-full rounded-xl" />}>
              <ChartSection />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="space-y-8">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center ml-4">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[50px] ml-auto" />
                  </div>
                ))}
              </div>
            }>
              <ActivitySection />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
