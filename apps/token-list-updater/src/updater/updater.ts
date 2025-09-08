import { initTokenList, TokenCacheRepository } from '@cowprotocol/repositories';
import { logger, doForever, sleep } from '@cowprotocol/shared';
import { Runnable } from '../../types';

const WAIT_TIME = 1000 * 60 * 60 * 6; // 6 hours

export type TokenListUpdaterProps = {
  chainId: number;
  tokenCacheRepository: TokenCacheRepository;
  delayInMilliseconds?: number;
};

export class TokenListUpdater implements Runnable {
  isStopping = false;

  constructor(private props: TokenListUpdaterProps) {}

  /**
   * Main loop: Run the token list updater. This method runs indefinitely,
   * updating the token list for a specific chain.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    await doForever({
      name: `TokenListUpdater for chain id: ${this.props.chainId}`,
      callback: async (stop) => {
        if (this.isStopping) {
          stop();
          return;
        }
        logger.info(`Updating token list for chain id: ${this.props.chainId}`);
        await (async () => {
          await sleep(this.props.delayInMilliseconds || 0);
          await this.updateTokenList();
        })();
      },
      waitTimeMilliseconds: WAIT_TIME,
      logger,
    });

    logger.info(
      `TokenListUpdater for chain id: ${this.props.chainId}`,
      'stopped'
    );
  }

  async stop(): Promise<void> {
    this.isStopping = true;
  }

  async updateTokenList(): Promise<void> {
    await initTokenList(this.props.chainId, this.props.tokenCacheRepository);

    logger.debug(
      `[tokenlist-updater:main] Token list updated for chain id: ${this.props.chainId}`
    );
  }
}
