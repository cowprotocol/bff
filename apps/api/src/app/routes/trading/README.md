# Example

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
        sellTokenDecimals: 18,
        buyTokenDecimals: 18,
        amount: '12000000000000000'
    }
})})
```