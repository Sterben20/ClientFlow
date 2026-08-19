import { z } from "zod";

export function validatePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const PHONE_REGEX = /^[0-9+()\-\s]+$/;
  
  if (!PHONE_REGEX.test(trimmed)) {
    throw new Error("Please enter a valid phone number.");
  }
  
  if (!/\d/.test(trimmed)) {
    throw new Error("Please enter a valid phone number.");
  }
  
  return trimmed;
}

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(255, "Title must be 255 characters or less"),
  description: z.preprocess((val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    }
    return val;
  }, z.string().max(5000, "Description must be 5000 characters or less").nullable().optional()),
  status: z.enum(["todo", "in_progress", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]),
  project_id: z.string().uuid("Invalid project UUID").nullable().optional(),
  client_id: z.string().uuid("Invalid client UUID").nullable().optional(),
  due_date: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().date("Invalid due date").nullable().optional()),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
