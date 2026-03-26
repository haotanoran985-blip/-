import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://www.asecondopinion.top/sitemap.xml",
    host: "https://www.asecondopinion.top",
  };
}
