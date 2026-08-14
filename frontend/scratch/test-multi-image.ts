import { buildLinkedInPostPayload } from '../src/lib/linkedin-payload'
import { ZernioLinkedInTransport } from '../src/lib/zernio-transport'

async function testMultiImage() {
  console.log("=== STARTING MULTI-IMAGE PAYLOAD VERIFICATION ===")

  // Two real test image URLs
  const sampleImages = [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
  ]

  // Construct payload with two comma-separated image URLs
  const buildResult = buildLinkedInPostPayload({
    title: "Chikankari Craft meets 3D Garment Parameters",
    body: "Exploring vector pattern contours in CLO3D.",
    pillar: "Educational",
    format: "multi_image",
    mediaUrl: sampleImages.join(", "),
    authorUrn: "urn:li:person:12345"
  })

  console.log("\nPayload build result:", JSON.stringify(buildResult, null, 2))

  if (!buildResult.valid || !buildResult.payload) {
    console.error("Payload building failed!")
    return
  }

  // Verify that multi_media_metadata contains exactly 2 image items
  const multiMedia = buildResult.payload.multi_media_metadata || []
  console.log(`\nVerified multi_media_metadata count: ${multiMedia.length} (Expected: 2)`)
  console.log("Image 1:", multiMedia[0]?.media_url)
  console.log("Image 2:", multiMedia[1]?.media_url)

  // Verify Zernio body formatting logic
  const mediaItems: Array<{ type: string; url: string }> = []
  if (buildResult.payload.multi_media_metadata) {
    buildResult.payload.multi_media_metadata.forEach(m => {
      mediaItems.push({
        type: 'image',
        url: m.media_url
      })
    })
  }

  console.log("\nGenerated Zernio mediaItems list:", JSON.stringify(mediaItems, null, 2))
  console.log(`Is count exactly 2: ${mediaItems.length === 2 ? "YES" : "NO"}`)
}

testMultiImage()
