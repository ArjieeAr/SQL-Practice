For each product category, compute its revenue and what **percentage of total revenue** it
represents.

A line item's revenue is `quantity × unit_price_cents`. Only categories with at least one sale
appear in the report.

### Output

| column          | description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `category`      | the category                                                     |
| `revenue_cents` | total revenue for the category, in cents                         |
| `pct_of_total`  | share of all revenue, as a percentage rounded to 1 decimal place |

Rows can be in any order.
