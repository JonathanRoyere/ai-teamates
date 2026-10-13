import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
  },
}

export default nextConfig

