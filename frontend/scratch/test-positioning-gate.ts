import { evaluateResearchRelevance } from '../src/lib/relevance-gate'

const TEST_ARTICLES = [
  {
    title: "Integrating CLO3D simulations with Ajrakh block printing workflows",
    summary: "A study on how 3D digital garment drape previews can be mapped with traditional hand-carved block prints before physical dyeing, optimizing fabric consumption and design layout planning.",
    source: "Journal of Textile Tech"
  },
  {
    title: "Artisan preservation: how digital archiving protects Kantha handloom templates",
    summary: "Emerging initiatives in West Bengal utilizing high-fidelity digital scans and vector templates to preserve heirloom Kantha embroidery patterns, enabling younger weavers to learn from historically accurate archives.",
    source: "Craft & Preservation Quarterly"
  },
  {
    title: "New bio-based fabrics developed from agricultural waste for contemporary womenswear",
    summary: "Researchers have successfully spun natural cellulose fibers extracted from crop residue into luxury-grade yarns, offering a circular and biodegradable alternative to polyester draping materials.",
    source: "Sustainable Textiles Journal"
  },
  {
    title: "AI-assisted flat patternmaking and draping optimization algorithms",
    summary: "A new design tool utilizes geometric machine learning to generate flat pattern templates directly from 3D body scans, adjusting seams to account for standard textile stretch and weave variations.",
    source: "IEEE Computer Graphics & Design"
  },
  {
    title: "Circular fashion: zero-waste garment layout construction techniques",
    summary: "An exploration of layout strategies that use jigsaw-like pattern placement on fabric rolls to ensure zero scrap waste is generated during fabric cutting phase of design production.",
    source: "Contemporary Womenswear Academy"
  },
  {
    title: "Kering group reports 12% drop in Q2 profits amid global luxury retail headwinds",
    summary: "The Paris-based luxury group Kering announced a decline in operating profits for the second quarter, citing slower foot traffic in key APAC markets and retail store operations restructuring costs.",
    source: "Financial Times Fashion Business"
  },
  {
    title: "Phoenix Footwear plans Rs 1,000-Cr plant expansion in Tamil Nadu",
    summary: "Phoenix Kothari Footwear Ltd has proposed a massive investment of Rs 1,000 crore to construct a non-leather footwear manufacturing plant in Tamil Nadu, creating over 20,000 factory floor jobs.",
    source: "Apparel Resources Tech"
  },
  {
    title: "Dior appoints new creative director after sudden executive shuffle",
    summary: "Dior has officially named its new design lead following the resignation of the previous director, aiming to refresh its seasonal haute couture lineup and brand strategy.",
    source: "Fashion Gossip & Trends"
  },
  {
    title: "Zara opens new 4,000 sq ft flagship store in London shopping district",
    summary: "Inditex Group is expanding its physical retail footprint with a massive smart store in London, featuring self-checkout kiosks and automatic fitting room reservation screens.",
    source: "Retail Insider"
  },
  {
    title: "Nike faces logistical delays due to Suez canal shipping bottlenecks",
    summary: "Shipping congestion in key maritime routes is delaying seasonal shoe and apparel shipments to European distribution centers, prompting Nike to rely on high-cost air freight alternatives.",
    source: "Supply Chain Management Daily"
  }
]

async function runTest() {
  console.log("=== STARTING DOUBLE GATED RELEVANCE & POSITIONING FIT TEST ===\n")
  for (const art of TEST_ARTICLES) {
    console.log(`Title: "${art.title}"`)
    console.log(`Source: ${art.source}`)
    
    try {
      const result = await evaluateResearchRelevance(art.title, art.summary)
      console.log(`Relevance Score: ${result.relevance_score}`)
      console.log(`Positioning Fit Score: ${result.positioning_fit_score}`)
      console.log(`Eligible: ${result.eligible ? 'ACCEPTED' : 'REJECTED'}`)
      console.log(`Why: ${result.why_it_matters_to_pranavi || result.relevance_reason}`)
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
    }
    console.log("------------------------------------------------------------------\n")
  }
}

runTest()
