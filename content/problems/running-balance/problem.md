A bank ledger stores deposits as positive amounts and withdrawals as negative amounts. Every
account starts with a balance of 0.

For every transaction, show the account's **balance right after it was applied**. Transactions are
applied in order of `posted_at`; transactions with the same `posted_at` are applied in order of
`id`.

### Output

| column           | description                                |
| ---------------- | ------------------------------------------ |
| `account_id`     | the account                                |
| `transaction_id` | the transaction's `id`                     |
| `amount`         | the transaction amount                     |
| `balance`        | the account balance after this transaction |

Sort by `account_id`, then in the order the transactions were applied.
