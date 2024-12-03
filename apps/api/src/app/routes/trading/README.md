# CoW Trading API


The **CoW Protocol** offers powerful and highly flexible trading capabilities, designed to facilitate complex decentralized finance (DeFi) interactions. However, its flexibility can also make it challenging for developers to interact [directly with the protocol](https://api.cow.fi/docs/#/default/post_api_v1_orders).

This **CoW Trading API** aims to simplify the interaction by abstracting the complexities. It automatically handles critical aspects such as parameter configuration, accurate calculations for token amounts, and signing orders.

This API functions as a wrapper around the [`@cowprotocol/cow-sdk`](https://github.com/cowprotocol/cow-sdk/blob/feat/swap-for-people/src/trading/README.md), making it easy to integrate CoW trading into your applications.

---

## Core Features
- **Simplified Order Management:** Abstracts the complexity of preparing, signing, and submitting orders.
- **Native Token Support:** Allows trading Ethereum and other native tokens seamlessly.
- **Smart-Contract Wallet Compatibility:** Includes support for wallets using EIP-1271 presigning.
- **Robust Transaction Handling:** Automatically computes necessary amounts and costs for trades.

---

## 1. **Get Quote**

The `/quote-requests` method provides a price quote for your desired trade. This includes information necessary to prepare, sign, and submit the order.

### API Endpoint
**POST** `https://bff.cow.fi/trading/quote-requests`

### Request Example

```js
fetch('https://bff.cow.fi/trading/quote-requests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
    trader: {
        account: '0xfb3c7eb936cAA12B5A884d612393969A557d4307',
        appCode: 'test1',
        chainId: 1,
    },
    params: {
        kind: 'sell',
        sellToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        buyToken: "0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab",
        amount: '12000000000000000'
    }
})})
```

## 2. Full Trading Flow

This section demonstrates the complete trading flow, from retrieving a quote to signing and sending an order to the order book.

### Steps
1. **Get Quote**: Use the `/quote-requests` endpoint to retrieve the trade details.
2. **Sign Order**: Connect your wallet and sign the order using EIP-712 typed data.
3. **Submit Order**: Send the signed order to the order book.

### Code Example

```js
(async function() {
  const trader = {
    account: '0xfb3c7eb936cAA12B5A884d612393969A557d4307',
    appCode: 'test1',
    chainId: 11155111
  }
  const params = {
    kind: 'sell',
    sellToken: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    buyToken: '0x0625afb445c3b6b7b929342a04a22599fd5dbb59',
    amount: '100000000000000000'
  }

  const callApi = (method, body) => fetch('https://bff.cow.fi/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderToSign, orderTypedData, appDataInfo } = await callApi('quote-requests', { trader, params })
  // Connect wallet
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  // Sign order
  const signature = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [accounts[0], JSON.stringify(orderTypedData)]
  })
  // Send order
  const orderId = await callApi('orders', {
    trader,
    quoteId: quoteResponse.id,
    signature, // Add order typed data signature (EIP-712)
    orderToSign,
    appDataInfo
  })

  console.log('Order Id:', orderId)
})()
```

## 3. Smart-Contract Wallet (EIP-1271 Pre-signing)

For smart-contract wallets, orders are signed using the [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) standard. This involves presigning the order and sending a transaction.

### Code Example

```js
(async function() {
  const trader = {
    account: '0xF568A3a2dfFd73C000E8E475B2D335A4A3818EBa',
    appCode: 'test1',
    chainId: 11155111
  }
  const params = {
    kind: 'sell',
    sellToken: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    buyToken: '0x0625afb445c3b6b7b929342a04a22599fd5dbb59',
    amount: '100000000000000000'
  }

  const callApi = (method, body) => fetch('https://bff.cow.fi/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderToSign, appDataInfo } = await callApi('quote-requests', { trader, params })
  // Connect wallet
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  // Send order
  const { orderId, preSignTransaction } = await callApi('orders', {
    trader,
    quoteId: quoteResponse.id,
    signingScheme: 'presign', // Signal to use pre-signing (smart-contract wallet)
    orderToSign,
    appDataInfo
  })

  // ACTION NEEDED: Send <preSignTransaction> from smart-contract wallet

  console.log('Order Id:', orderId)
  console.log('preSignTransaction:', preSignTransaction)
})()
```

## 4. Trading Native Tokens (ETH Flow)

To trade Ethereum (native token), use the `/sell-native-currency-requests` method, which generates a transaction object for direct submission to the network.

### Code Example

```js
(async function() {
  const trader = {
    account: '0xfb3c7eb936cAA12B5A884d612393969A557d4307',
    appCode: 'test1',
    chainId: 11155111
  }
  const params = {
    kind: 'sell',
    sellToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    buyToken: '0x0625afb445c3b6b7b929342a04a22599fd5dbb59',
    amount: '100000000000000000'
  }

  const callApi = (method, body) => fetch('https://bff.cow.fi/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderTypedData, appDataInfo, amountsAndCosts, tradeParameters } = await callApi('quote-requests', { trader, params })
  // Get transaction
  const { orderId, transaction } = await callApi('sell-native-currency-requests', {
    trader,
    quoteId: quoteResponse.id,
    tradeParameters,
    amountsAndCosts,
    appDataInfo,
  })
  // Connect wallet
  const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  // Send transaction
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ ...transaction, from: account }]
  })

  console.log('txHash:', txHash)
  console.log('orderId:', orderId)
})()
```