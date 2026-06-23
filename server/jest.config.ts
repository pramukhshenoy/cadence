import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  passWithNoTests: true,
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};

export default config;
