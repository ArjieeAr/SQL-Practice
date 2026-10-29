For each category, find its **top two products** by total units sold.

Ties are kept: a product makes the list if **fewer than two** products in its category sold
strictly more units than it did. So if two products tie for first place, they are the top two and
the third-best product is not included. Products with no sales are ignored.

### Output

| column       | description                       |
| ------------ | --------------------------------- |
| `category`   | the category                      |
| `product`    | the product name                  |
| `units_sold` | total units sold for that product |

Rows can be in any order.
