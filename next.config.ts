import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/blog/the-linguistic-von-neumann-bottleneck",
        destination: "/blog/you-cant-prompt-your-way-to-agent-security",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
