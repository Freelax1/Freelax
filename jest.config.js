/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        isolatedModules: true,
        target: 'es2019',
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
}
