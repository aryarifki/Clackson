import { z } from 'zod';

// Coercion helpers (accept string | number | string[] and normalize to trimmed string)
const S = z.coerce.string().transform(s => s.trim());
const SA = z.union([z.coerce.string(), z.array(z.coerce.string()), z.number().transform(n => String(n))])
  .transform(v => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).join(', ') : String(v).trim());

export const complexPromptItemSchema = z.object({
  request_summary: S,
  video_concept: z.object({
    title: S,
    logline: S,
    subject: S,
    setting: S,
  }),
  visuals: z.object({
    style_and_genre: z.object({
      primary_medium: S,
      visual_style: S,
      genre: S,
      artist_reference: SA,
    }),
    mood_and_atmosphere: z.object({
      mood: S,
      lighting: S,
      color_palette: SA,
    })
  }),
  cinematography: z.object({
    composition: z.object({
      shot_type: S,
      camera_angle: S,
      focus: S,
    }),
    motion: z.object({
      subject_action: S,
      camera_movement: S,
      dynamic_effects: SA,
    })
  }),
  audio: z.object({
    sound_effects: SA,
    background_music: SA, // newly added backsound parameter
  }),
  technical_parameters: z.object({
    duration_seconds: SA,
    aspect_ratio: S,
    quality: S,
    frame_rate: SA,
  }),
  negative_prompt: SA,
});

export const complexPromptArraySchema = z.array(complexPromptItemSchema).min(1);
export type ComplexPromptItem = z.infer<typeof complexPromptItemSchema>;
