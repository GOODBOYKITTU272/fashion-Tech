import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { scoreTopic } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.N8N_API_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch unprocessed signals
    const { data: signals, error: signalError } = await supabase
      .from('research_signals')
      .select('*')
      .eq('processed', false)

    if (signalError) throw signalError
    if (!signals || signals.length === 0) {
      return NextResponse.json({ message: 'No unprocessed signals' })
    }

    const processedCount = 0
    const results = []

    for (const signal of signals) {
      // Simple duplicate clustering (in V1, check if title is very similar to an existing cluster created today)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: existingClusters } = await supabase
        .from('topic_clusters')
        .select('*')
        .gte('created_at', today.toISOString())

      let matchedCluster = null
      if (existingClusters) {
        matchedCluster = existingClusters.find(c => 
          c.cluster_title.toLowerCase().includes(signal.title.toLowerCase()) ||
          signal.title.toLowerCase().includes(c.cluster_title.toLowerCase())
        )
      }

      let clusterId = ''
      
      if (matchedCluster) {
        // Increment signal count in existing cluster
        clusterId = matchedCluster.id
        await supabase
          .from('topic_clusters')
          .update({ signal_count: (matchedCluster.signal_count || 1) + 1 })
          .eq('id', clusterId)
      } else {
        // Create new cluster
        const { data: newCluster, error: clusterErr } = await supabase
          .from('topic_clusters')
          .insert({
            primary_signal_id: signal.id,
            cluster_title: signal.title,
            summary: signal.summary || 'Summary pending analysis.',
            signal_count: 1
          })
          .select()
          .single()

        if (clusterErr) continue
        clusterId = newCluster.id

        // Call AI Scoring Abstraction
        const scores = await scoreTopic(signal.title, signal.summary || '')

        // Save scores
        await supabase
          .from('topic_scores')
          .insert({
            cluster_id: clusterId,
            freshness_score: scores.freshness_score,
            source_trust_score: scores.source_trust_score,
            us_relevance_score: scores.us_relevance_score,
            uk_relevance_score: scores.uk_relevance_score,
            pranavi_alignment_score: scores.pranavi_alignment_score,
            total_opportunity_score: scores.total_opportunity_score,
            scored_by_model: process.env.AI_PROVIDER || 'openai'
          })
      }

      // Mark signal as processed
      await supabase
        .from('research_signals')
        .update({ processed: true })
        .eq('id', signal.id)

      results.push({ signal_id: signal.id, cluster_id: clusterId, clustered: !!matchedCluster })
    }

    return NextResponse.json({
      message: 'Processing complete',
      signals_processed: signals.length,
      results
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signal processing failed' }, { status: 500 })
  }
}
