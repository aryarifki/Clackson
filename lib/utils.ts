import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const MODELS = { gemini: 'gemini-2.5-pro', kimi: 'kimi-k2-0711-preview', deepseek: 'deepseek-chat' } as const;
export type SupportedProvider = keyof typeof MODELS;
export const providerLabel: Record<SupportedProvider, string> = { gemini: 'Gemini 2.5 Pro', kimi: 'Kimi K2 Preview', deepseek: 'Deepseek Chat' };

export interface PromptInput { idea: string; style?: string; mood?: string; camera?: string; lighting?: string; colorPalette?: string; motion?: string; duration?: string; }
export interface VeoPromptJSON { version: string; model: string; meta: { provider: SupportedProvider; createdAt: string }; prompt: { core_concept: string; style: string; mood: string; realism_directives: string[]; camera: string; lighting: string; color_palette: string; motion: string; duration: string; scene_breakdown: Array<{ order: number; description: string; key_visual_elements: string[]; continuity_notes: string }>; consistency: { character: string[]; environment: string[]; color: string[]; motion: string[] }; negative_prompts: string[]; final_instruction: string; }; }

export const SYSTEM_STYLE = `You are an expert video prompt engineer for Google's Veo. Output ONLY JSON matching interface VeoPromptJSON with no fences. Focus on realism, stylistic continuity, physical plausibility. Provide rich but concise scene_breakdown (max 8 scenes).`;
export function buildUserPrompt(input: PromptInput): string { return `Generate a Veo video JSON prompt for the idea: "${input.idea}"\nStyle: ${input.style || 'cinematic realism'}\nMood: ${input.mood || 'immersive, grounded'}\nCamera: ${input.camera || 'physically plausible cinematic moves'}\nLighting: ${input.lighting || 'naturalistic'}\nColor Palette: ${input.colorPalette || 'balanced cinematic'}\nMotion: ${input.motion || 'smooth natural'}\nDuration: ${input.duration || '8-12s'}\nEnsure continuity, realism, and consistent vibe.`; }

export const ARCHITECT_SYSTEM = `You are a 'Veo Prompt Architect', a specialist AI tasked with designing advanced descriptive video prompts for the Google Veo 3 generative AI model. Mandatory: respond ONLY with valid JSON (array of 10 objects) following the complexPromptItemSchema keys exactly. Expand brief ideas into cinematic, cohesive, technically rich prompts. Avoid extra commentary.`;

export function buildArchitectPrompt(coreIdea: string): string {
	return `User core idea: ${coreIdea}\nGenerate 10 distinct, high-quality long-form video concept prompt JSON objects covering varied cinematic interpretations while staying faithful to the core idea. Each object must include: request_summary, video_concept{title,logline,subject,setting}, visuals{style_and_genre{primary_medium,visual_style,genre,artist_reference}, mood_and_atmosphere{mood,lighting,color_palette}}, cinematography{composition{shot_type,camera_angle,focus}, motion{subject_action,camera_movement,dynamic_effects}}, audio{sound_effects}, technical_parameters{duration_seconds,aspect_ratio,quality,frame_rate}, negative_prompt, final_prompt_for_veo. Language: English.`;
}

export const COMPLEX_SINGLE_SYSTEM = `You are a 'Veo Prompt Architect'. Return ONLY one valid JSON object per request matching the complex prompt schema. Enrich details with cinematic, technical vocabulary. No commentary.`;
export function buildSingleVariationPrompt(coreIdea: string, index: number, total: number, dialogueInstruction?: string): string {
	return `Core idea: ${coreIdea}\nYou are generating variation ${index} of ${total}. Provide ONE JSON object only. Maintain consistency with idea but vary creative choices (style, mood, motion, setting, angle) in a cohesive narrative progression. Keys required: request_summary, video_concept{title,logline,subject,setting}, visuals{style_and_genre{primary_medium,visual_style,genre,artist_reference}, mood_and_atmosphere{mood,lighting,color_palette}}, cinematography{composition{shot_type,camera_angle,focus}, motion{subject_action,camera_movement,dynamic_effects}}, audio{sound_effects,background_music}, technical_parameters{duration_seconds,aspect_ratio,quality,frame_rate}, negative_prompt. ${dialogueInstruction ? `If helpful, integrate subtle implied actions supporting dialogue intention: ${dialogueInstruction}` : ''} Ensure duration_seconds is a concise number + 's' (e.g. '8s', '10s') and background_music describes genre & mood.`;
}
