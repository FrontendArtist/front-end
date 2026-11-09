const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '<rootDir>/.zwork/'],
  modulePathIgnorePatterns: ['<rootDir>/.zwork/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^swiper/css(?:/.*)?$': '<rootDir>/__mocks__/styleMock.js',
    '^.+\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
};

module.exports = createJestConfig(customJestConfig);
