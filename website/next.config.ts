import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,

  // The demo recording is by far the largest thing the site can serve, and it
  // only moves when the recording itself is replaced. A day of browser cache
  // keeps a second visit from paying for it again, and the revalidation window
  // means a replacement is still picked up without a new filename.
  async headers() {
    return [
      {
        source: "/video/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default config;
