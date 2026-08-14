export interface QueryCluster {
  id: string
  name: string
  description: string
  queries: string[]
}

export const FASHION_QUERY_PACK: Record<string, QueryCluster> = {
  INDIAN_CRAFT: {
    id: 'INDIAN_CRAFT',
    name: 'Indian Craft & Heritage Textiles',
    description: 'Traditional Indian weaving, block printing, embroidery, and craft preservation.',
    queries: [
      'Ajrakh contemporary fashion',
      'Ikat textile innovation',
      'Chikankari modern silhouette',
      'Kantha embroidery contemporary design',
      'Kalamkari natural dye fashion',
      'Indian textiles heritage craft',
      'artisan fashion preservation India',
      'handloom weaving sustainable fashion'
    ]
  },
  FASHION_TECH: {
    id: 'FASHION_TECH',
    name: 'Fashion Technology & AI',
    description: 'AI fashion design, 3D digital garment development, CLO 3D, and digital prototyping.',
    queries: [
      'AI fashion design workflows',
      'CLO 3D garment simulation',
      '3D digital fashion prototyping',
      'virtual sampling apparel manufacturing',
      'digital garment development',
      'fashion tech innovation 2026',
      'AI patternmaking fashion technology'
    ]
  },
  TEXTILES: {
    id: 'TEXTILES',
    name: 'Textile & Material Innovation',
    description: 'Bio-materials, smart fabrics, recycled yarns, and novel textile engineering.',
    queries: [
      'textile material innovation',
      'bio-materials sustainable fashion',
      'recycled elastic yarn textile',
      'smart textiles wearable technology',
      'natural dye textile innovation',
      'next generation plant textiles'
    ]
  },
  SUSTAINABILITY: {
    id: 'SUSTAINABILITY',
    name: 'Sustainable & Circular Fashion',
    description: 'Circular economy, zero-waste design, post-consumer recycling, and supply chain transparency.',
    queries: [
      'circular fashion post-consumer platform',
      'zero waste patternmaking fashion',
      'sustainable apparel manufacturing',
      'responsible production luxury fashion',
      'textile circularity technology'
    ]
  },
  CONTEMPORARY_DESIGN: {
    id: 'CONTEMPORARY_DESIGN',
    name: 'Contemporary Womenswear & Global Trends',
    description: 'Western silhouettes blended with Indian craft, contemporary tailoring, and global design trends.',
    queries: [
      'contemporary womenswear Indian craft',
      'craft-led fashion design',
      'global silhouettes traditional textiles',
      'modern Indian fashion architecture',
      'contemporary minimalist fashion trends'
    ]
  }
}

export function getRandomQueryFromCluster(clusterId: string): string {
  const cluster = FASHION_QUERY_PACK[clusterId]
  if (!cluster || cluster.queries.length === 0) return 'fashion technology'
  const index = Math.floor(Math.random() * cluster.queries.length)
  return cluster.queries[index]
}

export function getAllQueries(): string[] {
  return Object.values(FASHION_QUERY_PACK).flatMap(c => c.queries)
}
