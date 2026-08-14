import { createBrowserClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — uses anon key only. Service-role key is NEVER used here.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      brand_profile: {
        Row: {
          id: string
          brand_name: string
          positioning: string
          target_audience: string
          voice_guidelines: string
          content_rules: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
      }
      sources: {
        Row: {
          id: string
          name: string
          url: string
          tier: 1 | 2 | 3
          trust_score: number
          category: string
          is_active: boolean
          created_at: string
        }
      }
      research_signals: {
        Row: {
          id: string
          source_id: string | null
          url: string
          title: string
          summary: string | null
          raw_content: string | null
          category: string | null
          captured_at: string
          processed: boolean
        }
      }
      topic_clusters: {
        Row: {
          id: string
          primary_signal_id: string | null
          cluster_title: string
          summary: string | null
          signal_count: number
          created_at: string
        }
      }
      topic_scores: {
        Row: {
          id: string
          cluster_id: string
          freshness_score: number
          source_trust_score: number
          us_relevance_score: number
          uk_relevance_score: number
          pranavi_alignment_score: number
          total_opportunity_score: number
          scored_by_model: string | null
          scored_at: string
        }
      }
      content_ideas: {
        Row: {
          id: string
          cluster_id: string | null
          title: string
          angle: string
          pillar: 'Educational' | 'Storytelling' | 'Soft Selling'
          format: 'carousel' | 'text' | 'image' | 'video'
          status: 'pending' | 'drafted' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'skipped'
          planned_slot: string | null
          created_at: string
        }
      }
      drafts: {
        Row: {
          id: string
          content_idea_id: string
          current_version_id: string | null
          carousel_outline: Record<string, unknown> | null
          visual_brief: Record<string, unknown> | null
          fact_check_status: 'pending' | 'passed' | 'flagged'
          ai_provider_used: string | null
          created_at: string
        }
      }
      draft_versions: {
        Row: {
          id: string
          draft_id: string
          version_no: number
          author_type: 'AI' | 'human'
          hook: string | null
          body: string | null
          cta: string | null
          hashtags: string[] | null
          created_at: string
        }
      }
      approvals: {
        Row: {
          id: string
          draft_id: string
          action: 'approved' | 'edited' | 'rejected'
          rejection_reason: string | null
          notes: string | null
          acted_at: string
        }
      }
      content_calendar: {
        Row: {
          id: string
          content_idea_id: string | null
          draft_id: string | null
          planned_date: string
          planned_time: string | null
          pillar: 'Educational' | 'Storytelling' | 'Soft Selling'
          format: string
          status: 'draft' | 'approved' | 'scheduled' | 'published' | 'skipped'
          override_reason: string | null
          created_at: string
        }
      }
      published_posts: {
        Row: {
          id: string
          calendar_id: string | null
          linkedin_post_url: string | null
          native_post_id: string | null
          published_at: string
        }
      }
      post_metrics: {
        Row: {
          id: string
          published_post_id: string
          snapshot_at: string
          impressions: number
          reactions: number
          comments: number
          reposts: number
          profile_views: number | null
          followers_total: number | null
          usa_followers: number | null
          uk_followers: number | null
          metadata: Record<string, unknown> | null
        }
      }
      weekly_reports: {
        Row: {
          id: string
          week_start: string
          summary: string
          best_post_id: string | null
          recommendations: Record<string, unknown> | null
          generated_at: string
        }
      }
      learning_memory: {
        Row: {
          id: string
          category: string
          insight: string
          confidence_score: number
          evidence_source: string | null
          created_at: string
        }
      }
    }
  }
}
