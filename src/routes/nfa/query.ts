export const NFA_QUERY = `
    with total_users as (select count(distinct encode(owner, 'hex')) as cnt_users,
                                count(*)                             as cnt_orders
                         from orders
                         where creation_timestamp >= now() - interval '1' hour)


-- SHOW THE LARGEST NUMBER OUT OF TWO
-- if users buy usdc/dai or usdt then retunr next row
-------------------------

-- most purchased token in the past hour by orders
-- example output: 36% of the orders in the past hour were to buy ETH

       , top_buy_orders as (select 'buy order'                          as message,
                                   case
                                       when encode(buy_token, 'hex') = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' or
                                            encode(buy_token, 'hex') = 'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
                                           then 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                                       else encode(buy_token, 'hex') end
                                                                        as token,
                                   cnt_orders                           as group_col,
                                   count(*)                             as order_col,
                                   count(*) / cast(cnt_orders as float) as percent,
                                   RANK()                                  OVER (ORDER BY count(*) desc) rank_number
                            from orders o,
                                 total_users
                            where creation_timestamp >= now() - interval '1' hour
                              and encode(buy_token, 'hex') not in ('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                                                                   '6b175474e89094c44da98b954eedeac495271d0f',
                                                                   'dac17f958d2ee523a2206206994597c13d831ec7')
                            group by 1, 2, 3
                            order by 4 desc
        limit 5
        )


-- most users (x %) prefered x token
-- example output: 22% of all users in the past hour bought ETH

       , top_buy_traders as (
    select
        'buy users' as message, case when encode(buy_token, 'hex')='eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' or
        encode(buy_token, 'hex')='c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' then 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        else encode(buy_token, 'hex') end
        as token, cnt_users as group_col, count (distinct encode(owner, 'hex')) as order_col, count (distinct encode(owner, 'hex'))/ cast (cnt_users as float) as percent, RANK() OVER (ORDER BY count (distinct encode(owner, 'hex')) desc) rank_number
    from orders o, total_users
    where creation_timestamp >= now() - interval '1' hour
      and encode(buy_token
        , 'hex') not in ('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        , '6b175474e89094c44da98b954eedeac495271d0f'
        , 'dac17f958d2ee523a2206206994597c13d831ec7')
    group by 1, 2, 3
    order by 4 desc
        limit 5
        )


-- most sold token in the past hour

            , top_sell_orders as (
    select
        'sell order' as message, case when encode(sell_token, 'hex')='eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' or
        encode(sell_token, 'hex')='c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' then 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        else encode(sell_token, 'hex') end
        as token, cnt_orders as group_col, count (*) as order_col, count (*)/ cast (cnt_orders as float) as percent, RANK() OVER (ORDER BY count (*) desc) rank_number
    from orders o, total_users
    where creation_timestamp >= now() - interval '1' hour
      and encode(sell_token
        , 'hex') not in ('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        , '6b175474e89094c44da98b954eedeac495271d0f'
        , 'dac17f958d2ee523a2206206994597c13d831ec7')
    group by 1, 2, 3
    order by 4 desc
        limit 5
        )


-- most users (x %) prefered x token
-- example output: 22% of all users in the past hour bought ETH

            , top_sell_traders as (
    select
        'sell users' as message, case when encode(sell_token, 'hex')='eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' or
        encode(sell_token, 'hex')='c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' then 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        else encode(sell_token, 'hex') end
        as token, cnt_users as group_col, count (distinct encode(owner, 'hex')) as order_col, count (distinct encode(owner, 'hex'))/ cast (cnt_users as float) as percent, RANK() OVER (ORDER BY count (distinct encode(owner, 'hex')) desc) rank_number
    from orders o, total_users
    where creation_timestamp >= now() - interval '1' hour
      and encode(sell_token
        , 'hex') not in ('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        , '6b175474e89094c44da98b954eedeac495271d0f'
        , 'dac17f958d2ee523a2206206994597c13d831ec7')
    group by 1, 2, 3
    order by 4 desc
        limit 5
        )

    select message, token, percent, rank_number
    from top_buy_orders

    union all

    select message, token, percent, rank_number
    from top_buy_traders

    union all

    select message, token, percent, rank_number
    from top_sell_orders

    union all

    select message, token, percent, rank_number
    from top_sell_traders

    order by 1, 3 desc
`