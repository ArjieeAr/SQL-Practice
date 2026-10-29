-- Without PARTITION BY, balances run across all accounts
SELECT account_id, id AS transaction_id, amount,
       SUM(amount) OVER (ORDER BY posted_at, id) AS balance
FROM transactions
ORDER BY account_id, posted_at, id;
