import { generateLinkedInPdfCarousel } from '../src/lib/carousel-engine'

async function runTest() {
  console.log("=== STARTING UNIFIED CAROUSEL DESIGN GENERATION TEST ===")
  const result = await generateLinkedInPdfCarousel({
    title: "Unifying Code & Craft in Digital Draping Systems",
    hook: "How software parameters meet traditional block printing to reduce layout waste by 45% and save $5B annually.",
    sections: [
      {
        heading: "1. The Digital Blueprint",
        body: "Using CLO3D simulations, designers can drape fabrics virtually. This yields 100% accurate measurements before scissors meet textile."
      },
      {
        heading: "2. The Artisanal Block",
        body: "Mapping woodblock patterns onto digital meshes preserves traditional geometries while enabling instant pattern adjustments."
      }
    ],
    sources: [{ name: "Textile Today" }, { name: "Vogue Business" }]
  })

  console.log("\nGeneration result:", JSON.stringify(result, null, 2))
}

runTest()
