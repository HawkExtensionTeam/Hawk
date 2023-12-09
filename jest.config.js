module.exports = {
    testEnvironment: 'jsdom',
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.([jt]sx?)$',
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
    verbose: true,
    collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts'],
    coverageReporters: ['text', 'lcov'],
    roots: ['src'],
    moduleDirectories: ['node_modules', 'src'],
    maxWorkers: 1,
};