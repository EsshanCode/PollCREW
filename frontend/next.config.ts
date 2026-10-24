import type { NextConfig } from "next";
// Local: FastAPI on 127.0.0.1:8000. Vercel: set BACKEND_URL to the Render API URL.
const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};
export default config;
