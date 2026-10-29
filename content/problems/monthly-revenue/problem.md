Finance wants a 2025 revenue report with **one row for every month**, January through December,
including months with no sales.

Only orders with status `'completed'` count; cancelled and refunded orders are ignored.

### Output

| column        | description                                            |
| ------------- | ------------------------------------------------------ |
| `month`       | the first day of the month, as a `date` (`2025-01-01`) |
| `order_count` | number of completed orders that month                  |
| `revenue`     | sum of their `total`, or `0` if there were none        |

Sort by `month`.

**Hint:** `generate_series` can produce a row for every month.
