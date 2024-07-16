/* eslint-disable */
export default {
  displayName: 'notification-producer',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/notification-producer',
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};
