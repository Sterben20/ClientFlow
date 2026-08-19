import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTaskStatus(status: unknown): string {
  if (typeof status !== 'string') return 'Unknown';
  switch (status) {
    case 'todo': return 'Todo';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export function formatProjectStatus(status: unknown): string {
  if (typeof status !== 'string') return 'Unknown';
  switch (status) {
    case 'planning': return 'Planning';
    case 'active': return 'Active';
    case 'completed': return 'Completed';
    case 'on_hold': return 'On Hold';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}
