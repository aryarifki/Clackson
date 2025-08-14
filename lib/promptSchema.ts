import { z } from 'zod';

export const veoPromptSchema = z.object({
  version: z.string().optional(),
  model: z.string().optional(),
  meta: z.object({ provider: z.string(), createdAt: z.string() }).partial().optional(),
  prompt: z.object({
    core_concept: z.string(),
    style: z.string(),
    mood: z.string(),
    realism_directives: z.array(z.string()),
    camera: z.string(),
    lighting: z.string(),
    color_palette: z.string(),
    motion: z.string(),
    duration: z.string(),
    scene_breakdown: z.array(z.object({
      order: z.number(),
      description: z.string(),
      key_visual_elements: z.array(z.string()),
      continuity_notes: z.string(),
    })).max(8),
    consistency: z.object({
      character: z.array(z.string()),
      environment: z.array(z.string()),
      color: z.array(z.string()),
      motion: z.array(z.string()),
    }),
    negative_prompts: z.array(z.string()),
    final_instruction: z.string(),
  })
});

export type VeoPrompt = z.infer<typeof veoPromptSchema>;
