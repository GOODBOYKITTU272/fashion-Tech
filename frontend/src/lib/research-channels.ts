export interface ResearchChannel {
  channel_id: string
  channel_name: string
  platform: string
  runtime: 'cloud' | 'local'
  enabled: boolean
  production_safe: boolean
  requires_auth: boolean
  requires_cookie: boolean
  topic_families: string[]
  priority: 'high' | 'medium' | 'low'
  max_signals_per_run: number
}

export const RESEARCH_CHANNELS: ResearchChannel[] = [
  {
    channel_id: 'rss_fashion_tech',
    channel_name: 'Fashion Tech & Sustainability RSS',
    platform: 'RSS',
    runtime: 'cloud',
    enabled: true,
    production_safe: true,
    requires_auth: false,
    requires_cookie: false,
    topic_families: ['fashion technology', 'sustainable fashion', 'textile innovation'],
    priority: 'high',
    max_signals_per_run: 5
  },
  {
    channel_id: 'jina_web_reader',
    channel_name: 'Jina Reader Web Article Enrichment',
    platform: 'Web Pages',
    runtime: 'cloud',
    enabled: true,
    production_safe: true,
    requires_auth: false,
    requires_cookie: false,
    topic_families: ['fashion technology', 'Indian craftsmanship', 'contemporary design'],
    priority: 'high',
    max_signals_per_run: 5
  },
  {
    channel_id: 'github_fashion_repos',
    channel_name: 'GitHub Open Source Fashion-Tech & CLO 3D',
    platform: 'GitHub',
    runtime: 'cloud',
    enabled: true,
    production_safe: true,
    requires_auth: false,
    requires_cookie: false,
    topic_families: ['CLO 3D', 'AI in fashion', 'digital garment development'],
    priority: 'medium',
    max_signals_per_run: 3
  },
  {
    channel_id: 'youtube_craft_tutorials',
    channel_name: 'YouTube Indian Craft & Textile Innovation',
    platform: 'YouTube',
    runtime: 'cloud',
    enabled: true,
    production_safe: true,
    requires_auth: false,
    requires_cookie: false,
    topic_families: ['Indian craftsmanship', 'Indian textiles', 'artisan knowledge'],
    priority: 'medium',
    max_signals_per_run: 3
  },
  // LOCAL ONLY SOCIAL RESEARCH CHANNELS
  {
    channel_id: 'twitter_x_fashion',
    channel_name: 'Twitter/X Fashion-Tech Trends',
    platform: 'Twitter/X',
    runtime: 'local',
    enabled: false,
    production_safe: false,
    requires_auth: true,
    requires_cookie: true,
    topic_families: ['fashion technology', 'AI in fashion'],
    priority: 'high',
    max_signals_per_run: 5
  },
  {
    channel_id: 'instagram_fashion_craft',
    channel_name: 'Instagram Craft & Contemporary Womenswear',
    platform: 'Instagram',
    runtime: 'local',
    enabled: false,
    production_safe: false,
    requires_auth: true,
    requires_cookie: true,
    topic_families: ['Indian textiles', 'contemporary womenswear', 'craft preservation'],
    priority: 'high',
    max_signals_per_run: 5
  },
  {
    channel_id: 'reddit_fashion_tech',
    channel_name: 'Reddit Fashion & Technology Communities',
    platform: 'Reddit',
    runtime: 'local',
    enabled: false,
    production_safe: false,
    requires_auth: true,
    requires_cookie: true,
    topic_families: ['CLO 3D', 'fashion technology'],
    priority: 'medium',
    max_signals_per_run: 3
  },
  {
    channel_id: 'facebook_artisan_groups',
    channel_name: 'Facebook Textile & Artisan Groups',
    platform: 'Facebook',
    runtime: 'local',
    enabled: false,
    production_safe: false,
    requires_auth: true,
    requires_cookie: true,
    topic_families: ['Indian craftsmanship', 'artisan knowledge'],
    priority: 'low',
    max_signals_per_run: 2
  },
  {
    channel_id: 'xiaohongshu_trends',
    channel_name: 'Xiaohongshu Global Silhouettes & Design Trends',
    platform: 'Xiaohongshu',
    runtime: 'local',
    enabled: false,
    production_safe: false,
    requires_auth: true,
    requires_cookie: true,
    topic_families: ['contemporary womenswear', 'global design trends'],
    priority: 'medium',
    max_signals_per_run: 3
  }
]

export function getProductionSafeChannels(): ResearchChannel[] {
  return RESEARCH_CHANNELS.filter(c => c.production_safe && c.enabled)
}

export function getLocalOnlyChannels(): ResearchChannel[] {
  return RESEARCH_CHANNELS.filter(c => c.runtime === 'local')
}
