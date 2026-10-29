-- With ORDER BY posted_at alone, transactions at the same moment share one balance
SELECT account_id, id AS transaction_id, amount,
       SUM(amount) OVER (PARTITION BY account_id ORDER BY posted_at) AS balance
FROM transactions
ORDER BY account_id, posted_at, id;
