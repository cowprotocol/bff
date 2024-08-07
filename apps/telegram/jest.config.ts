/* eslint-disable */
export default {
  displayName: 'telegram',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/telegram',
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};
