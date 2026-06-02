import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // Env vars required at import time (e.g. config/en.ts asserts JWT_SECRET).
        env: {
            JWT_SECRET: 'test-secret-for-vitest',
            NODE_ENV: 'test',
        },
        include: ['src/**/*.test.ts'],
    },
})
