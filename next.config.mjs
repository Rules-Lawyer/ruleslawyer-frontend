// basePath is baked in at build time. Default to root ('') so the dashboard is
// served directly at the env host (e.g. library.geekway.com); pass a non-empty
// NEXT_PUBLIC_BASE_PATH build arg (see Dockerfile) to nest it under a prefix.
// Auth routes follow basePath, so callback/logout URLs in Auth0 must match.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next 16 no longer runs ESLint during `next build`, so the former
    // `eslint.ignoreDuringBuilds` option was dropped (it now warns as unknown).
    basePath,
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
        NEXT_PUBLIC_PROFILE_ROUTE: `${basePath}/auth/profile`,
        NEXT_PUBLIC_ACCESS_TOKEN_ROUTE: `${basePath}/auth/access-token`,
        LEGACY_ADMIN_URL: process.env.LEGACY_ADMIN_URL,
        LEGACY_LIBRARIAN_URL: process.env.LEGACY_LIBRARIAN_URL,
        LEGACY_PLAY_PRIZE_ENTRY_URL: process.env.LEGACY_PLAY_PRIZE_ENTRY_URL,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 's.gravatar.com',
                pathname: '**',
            },
            {
              protocol: "https",
              hostname: "*.googleusercontent.com",
              port: "",
              pathname: "**",
            },
            {
                protocol: "https",
                hostname: "*.auth0.com",
                port: "",
                pathname: "**"
            },
            {
                protocol: "https",
                hostname: "*.fbsbx.com",
                port: "",
                pathname: "**"
            },
            {
                protocol: "https",
                hostname: "*.live.net",
                port: "",
                pathname: "**"
            },
        ],

    },
    output: 'standalone',
    allowedDevOrigins: ['192.168.68.71'],
};

export default nextConfig;
