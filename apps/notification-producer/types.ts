/**
 * A Runnable program
 */
export interface Runnable {
  /**
   * Start the program, this method should not throw or finish.
   */
  start(): Promise<void>;
}
