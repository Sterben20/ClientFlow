import { Activity } from "@/types";
import { ActivityTimestamp } from "./activity-timestamp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatProjectStatus, formatTaskStatus } from "@/lib/utils";

interface ActivityItemProps {
  activity: Activity;
}

export function formatActivityText(activity: Activity): React.ReactNode {
  const actorName = activity.profiles?.full_name || activity.profiles?.email || 'Unknown user';
  
  // Safe metadata parsing
  let meta: Record<string, string> = {};
  if (activity.metadata && typeof activity.metadata === 'object') {
    meta = activity.metadata as Record<string, string>;
  }

  const actorNode = <span className="font-semibold text-foreground">{actorName}</span>;

  // Provide a safe fallback if essential metadata is missing for a newly generated event
  const isMissing = (val: unknown) => val === undefined || val === null || val === '';

  switch (activity.action) {
    case 'client.created': 
      if (isMissing(meta.name)) return <>{actorNode} created a client <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} created client &apos;{meta.name}&apos;</>;
    case 'client.deleted': 
      if (isMissing(meta.name)) return <>{actorNode} deleted a client <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} deleted client &apos;{meta.name}&apos;</>;
    
    case 'project.created': 
      if (isMissing(meta.name)) return <>{actorNode} created a project <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} created project &apos;{meta.name}&apos;</>;
    case 'project.deleted': 
      if (isMissing(meta.name)) return <>{actorNode} deleted a project <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} deleted project &apos;{meta.name}&apos;</>;
    case 'project.status_changed': 
      if (isMissing(meta.name) || isMissing(meta.previous_status) || isMissing(meta.new_status)) 
        return <>{actorNode} changed a project status <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} changed project &apos;{meta.name}&apos; from {formatProjectStatus(meta.previous_status)} to {formatProjectStatus(meta.new_status)}</>;
    
    case 'task.created': 
      if (isMissing(meta.title)) return <>{actorNode} created a task <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} created task &apos;{meta.title}&apos;</>;
    case 'task.deleted': 
      if (isMissing(meta.title)) return <>{actorNode} deleted a task <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} deleted task &apos;{meta.title}&apos;</>;
    case 'task.status_changed': 
      if (isMissing(meta.title) || isMissing(meta.previous_status) || isMissing(meta.new_status)) 
        return <>{actorNode} changed a task status <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} changed task &apos;{meta.title}&apos; from {formatTaskStatus(meta.previous_status)} to {formatTaskStatus(meta.new_status)}</>;
    
    case 'note.created': 
      return <>{actorNode} added a note</>;
    case 'note.deleted': 
      return <>{actorNode} deleted a note</>;
    
    case 'member.added': 
      if (isMissing(meta.member_name)) return <>{actorNode} added a member to the workspace <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} added {meta.member_name} to the workspace</>;
    case 'member.removed': 
      if (isMissing(meta.member_name)) return <>{actorNode} removed a member from the workspace <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} removed {meta.member_name} from the workspace</>;
    
    case 'deal.created':
      if (isMissing(meta.name)) return <>{actorNode} created a deal <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} created deal &apos;{meta.name}&apos;</>;
    case 'deal.deleted':
      if (isMissing(meta.name)) return <>{actorNode} deleted a deal <span className="text-destructive text-xs">(missing metadata)</span></>;
      return <>{actorNode} deleted deal &apos;{meta.name}&apos;</>;
    case 'deal.stage_changed':
      if (isMissing(meta.name) || isMissing(meta.previous_stage) || isMissing(meta.new_stage))
        return <>{actorNode} changed a deal stage <span className="text-destructive text-xs">(missing metadata)</span></>;
      if (meta.new_stage === 'won') {
        return <>{actorNode} marked deal &apos;{meta.name}&apos; as <span className="text-emerald-600 font-medium">Won</span></>;
      }
      if (meta.new_stage === 'lost') {
        return <>{actorNode} marked deal &apos;{meta.name}&apos; as <span className="text-red-600 font-medium">Lost</span></>;
      }
      const formatStage = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      return <>{actorNode} changed deal &apos;{meta.name}&apos; from {formatStage(meta.previous_stage)} to {formatStage(meta.new_stage)}</>;

    default: 
      return <>{actorNode} performed an action</>;
  }
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const text = formatActivityText(activity);
  const actorName = activity.profiles?.full_name || activity.profiles?.email || 'Unknown user';
  const initial = actorName.charAt(0).toUpperCase();
  
  return (
    <div className="flex items-start gap-3 text-sm group">
      <Avatar className="h-8 w-8 border">
        <AvatarImage src={activity.profiles?.avatar_url || ''} alt={actorName} />
        <AvatarFallback className="text-xs bg-muted text-muted-foreground">{initial}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1 mt-1">
        <p className="leading-snug text-muted-foreground">{text}</p>
        <p className="text-xs text-muted-foreground/70">
          <ActivityTimestamp date={activity.created_at} />
        </p>
      </div>
    </div>
  );
}

