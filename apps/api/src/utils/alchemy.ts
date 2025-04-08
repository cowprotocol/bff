import { SupportedChainId } from '@cowprotocol/cow-sdk';

const AlchemyNetworkByChainId: Record<SupportedChainId, string> = {
    [SupportedChainId.MAINNET]: 'eth-mainnet',
    [SupportedChainId.GNOSIS_CHAIN]: 'eth-gnosis',
    [SupportedChainId.ARBITRUM_ONE]: 'eth-arbitrum',
    [SupportedChainId.SEPOLIA]: 'eth-sepolia',
    [SupportedChainId.BASE]: 'eth-base',
  };

export async function fetchTokenHistory(token: string, startTime: Date, endTime: Date, auth_token: string, chain_id: SupportedChainId) {
    const options = {
      method: 'POST',
      headers: {accept: 'application/json', 'content-type': 'application/json', 'Authorization': `Bearer ${auth_token}`},
      body: JSON.stringify({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        interval: '5m',
        address: token,
        network: AlchemyNetworkByChainId[chain_id],
      })
    };
  
    console.log(`request=${JSON.stringify(options)}`);
  
    try {
      const response = await fetch('https://api.g.alchemy.com/prices/v1/tokens/historical', options);
      const data = await response.json();
      return data.data;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }