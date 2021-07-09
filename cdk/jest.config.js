module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/api'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
