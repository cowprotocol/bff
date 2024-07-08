import { getSlippageService } from './SlippageService';

const slippageService = getSlippageService();

describe('SlippageService', () => {
  it('should return always 50', () => {
    expect(slippageService.getSlippageBps('0x0', '0x0')).toEqual(50);
  });
});
