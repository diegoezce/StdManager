import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blest.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // Only public, indexable pages belong in the sitemap. The rest of the app
  // sits behind authentication and is excluded via robots.ts.
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
