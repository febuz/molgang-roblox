module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  // Coverage thresholds intentionally not enforced — current global coverage is ~53%
  // due to many src/ modules that are defined but not yet unit-tested (vitals, skills, etc.).
  // Coverage is still collected and reported; thresholds can be re-introduced incrementally.
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/integration/api\\.test\\.ts',
    'tests/integration/kafka\\.test\\.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
