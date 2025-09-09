import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI tests', () => {
  // TODO: implement properly this test
  it.skip('should print a message', () => {
    const cliPath = join(process.cwd(), 'dist/apps/token-list-updater');

    const output = execSync(`node ${cliPath}`).toString();

    expect(output).toMatch(/Hello World/);
  });
});
