// Admission is selected explicitly for each deployment, on both server and client.
export const PLAYGROUND_JOIN_ENABLED = process.env.NEXT_PUBLIC_ARENA_DEV === 'true' || process.env.NEXT_PUBLIC_ARENA_ENABLED === 'true';
export const PLAYGROUND_PAUSED_MESSAGE = 'The playground is temporarily closed while we improve arena performance.';
