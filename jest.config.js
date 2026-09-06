const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') })

/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  resolver: '<rootDir>/jest-resolver.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.ts',
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.tsx',
  ],
  testPathIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/]',
    '[\\\\/]\\.next[\\\\/]',
    '[\\\\/]\\.kilo[\\\\/]',
    '[\\\\/]frontend[\\\\/]',
  ],
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest-transformer.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
}

