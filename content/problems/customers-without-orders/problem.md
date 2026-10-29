An online store lets people check out as guests. Guest orders aren't linked to a customer, so
their `customer_id` is `NULL`.

Find every registered customer who has **never placed an order**.

### Output

| column        | description         |
| ------------- | ------------------- |
| `customer_id` | the customer's `id` |
| `name`        | the customer's name |

Rows can be in any order.
