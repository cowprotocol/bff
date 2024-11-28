# Example

### Get quote
```ts
fetch('http://127.0.0.1:8080/trading/getQuote', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
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

### EOA Get quote -> sign -> send

```ts
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

  const callApi = (method, body) => fetch('http://127.0.0.1:8080/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderTypedData, appDataInfo } = await callApi('getQuote', { trader, params })
  // Connect wallet
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  // Sign order
  const signature = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [accounts[0], JSON.stringify(orderTypedData)]
  })
  // Send order
  const orderId = await callApi('postOrder', {
    signature,
    trader,
    quoteResponse,
    orderTypedData,
    appDataInfo
  })

  console.log('Order Id:', orderId)
})()
```

### Smart-contract wallet (pre-sign)

```ts
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

  const callApi = (method, body) => fetch('http://127.0.0.1:8080/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderTypedData, appDataInfo } = await callApi('getQuote', { trader, params })
  // Connect wallet
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  // Send order
  const { orderId, preSignTransaction } = await callApi('postOrder', {
    signingScheme: 'presign', // Signal to use pre-signing (smart-contract wallet)
    trader,
    quoteResponse,
    orderTypedData,
    appDataInfo
  })

  // ACTION NEEDED: Send <preSignTransaction> from smart-contract wallet

  console.log('Order Id:', orderId)
  console.log('preSignTransaction:', preSignTransaction)
})()
```

### Eth-flow

```ts
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

  const callApi = (method, body) => fetch('http://127.0.0.1:8080/trading/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(res => res.json())

  // Get quote
  const { quoteResponse, orderTypedData, appDataInfo, amountsAndCosts, tradeParameters } = await callApi('getQuote', { trader, params })
  // Get transaction
  const { orderId, transaction } = await callApi('getEthFlowTransaction', {
    quoteId: quoteResponse.id,
    trader,
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