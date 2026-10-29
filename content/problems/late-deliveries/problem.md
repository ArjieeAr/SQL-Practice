A courier promises each delivery by a certain date. Find the deliveries that **arrived after**
their promised date, and how many days late they were.

Deliveries that haven't arrived yet (`delivered_on` is `NULL`) are not included. A delivery that
arrives on the promised date is on time.

### Output

| column      | description                                   |
| ----------- | --------------------------------------------- |
| `id`        | the delivery's `id`                           |
| `order_ref` | the order reference                           |
| `days_late` | days between `promised_on` and `delivered_on` |

Sort by `days_late` from most to least late, then by `id`.
