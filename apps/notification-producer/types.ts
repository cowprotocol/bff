/**
 * A Runnable program
 */
export interface Runnable {
  /**
   * Start the program, this method should not throw or finish.
   */
  start(): Promise<void>;

  /**
   * Stop the program, this method should not throw or finish.
   */
  stop(): Promise<void>;
}
