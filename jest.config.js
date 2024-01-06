module.exports = {
    coverageReporters: ['text', 'lcov'],
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: [
        '**/*."{js,jsx}',
        '!**/node_modules/**',
        '!**/assets/**'
    ],
    coverageDirectory: '/tmp/',
    coveragePathIgnorePatterns: [
        'node_modules',
        'assets'
    ],
    coverageProvider: 'v8',
    coverageThreshold: { // this should be increased later
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
        }
    },
    preset: 'jest-puppeteer',
    resetMocks: true,
    setupFiles: ['<rootDir>/mock-extension-apis.js'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/assets/'
    ],
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 10000,
    verbose: true,
};