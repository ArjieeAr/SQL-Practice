A meeting-room system let some bookings overlap. Find every pair of bookings for the **same room**
whose times overlap.

A booking occupies its room from `starts_at` up to, but not including, `ends_at`. So a booking that
ends at 10:00 does not overlap one that starts at 10:00.

### Output

| column      | description                          |
| ----------- | ------------------------------------ |
| `first_id`  | the smaller booking `id` of the pair |
| `second_id` | the larger booking `id` of the pair  |

List each pair once (with `first_id < second_id`). Rows can be in any order.
