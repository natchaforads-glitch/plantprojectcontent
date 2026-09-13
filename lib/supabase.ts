import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const BUCKET = 'plant-media'

export type Post = {
  id: string
  content_number: number
  category: string
  platform_channel: string
  format: string
  hook_name: string
  caption_en: string
  hashtags: string[]
  vb_background: string
  vb_typography: string
  vb_props: string
  vb_mood: string
  media_urls: string[]
  status: string
  notes: string
  updated_at: string
}
