Prices change over time. Each row in `price_changes` sets a product's price **from its
`effective_on` date onward** (inclusive), until the next change.

Compute each order's total: its `quantity` times the price that was in effect **on the day the
order was placed**. If an order was placed before its product had any price, its total is `NULL`.

### Output

| column     | description                                     |
| ---------- | ----------------------------------------------- |
| `order_id` | the order's `id`                                |
| `total`    | `quantity × price` on the order date, or `NULL` |

Rows can be in any order.
