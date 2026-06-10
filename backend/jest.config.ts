// backend/jest.config.ts

import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset to compile and process TypeScript files during test runs
  preset: 'ts-jest',
  
  // Set execution environment to Node.js (backend)
  testEnvironment: 'node',
  
  // Collect coverage information during testing
  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  // Enforce a strict minimum coverage threshold of 80%
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 35,
      statements: 35,
    },
  },
  
  // Map module import alias @/* to rootDir/src/* for Jest resolution matching tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Locate test files matching the test pattern inside the tests/ directory
  testMatch: [
    '**/tests/**/*.test.ts',
  ],
  
  // Verbose logs output
  verbose: true,
  
  // Force exit to ensure background threads (like Redis/sockets) do not hang Jest
  forceExit: true,
  clearMocks: true,
};

export default config;
