import type { MetadataRoute } from "next";

// Personal single-user instance — keep it out of search engines entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
