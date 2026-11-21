module.exports = {
    distDir: process.env.COUNCIL_DIST_DIR === '.next-council-preview' ? '.next-council-preview' : process.env.NEXT_PUBLIC_ARENA_DEV === 'true' ? '.next-arena-dev' : '.next',
    // Keep shuffle source available while excluding it from this release.
    async redirects() {
        return [
            // Enable on the verified Council release or an isolated preview.
            ...(process.env.COUNCIL_ENABLED === 'true' ? [] : [
                { source: "/council/:path*", destination: "/", permanent: false },
            ]),
            // Exact page redirect only: existing 3D asset URLs stay valid.
            { source: "/arena/playground", destination: "/arena/playtest", permanent: false },
            { source: "/arena/depths", destination: "/arena", permanent: false },
            { source: "/arena/fight", destination: "/arena", permanent: false },
            { source: "/market/shuffle/:path*", destination: "/market", permanent: false },
        ];
    },
    experimental: {
        cpus: 1,
    },
    env: {
        NEXT_PUBLIC_COUNCIL_ENABLED: process.env.COUNCIL_ENABLED === 'true' ? 'true' : 'false',
        NEXT_PUBLIC_WALLET_NETWORK: process.env.NEXT_PUBLIC_WALLET_NETWORK === 'testnet' ? 'testnet' : 'mainnet',
    },
}
