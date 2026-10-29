A streaming service wants to size its servers. Find the **highest number of sessions that were
live at the same time**, and the **earliest moment** that peak was reached.

A session is live from `started_at` up to, but not including, `ended_at`. So a session that ends
at 10:00 and another that starts at 10:00 were never live at the same time.

### Output

Return exactly **one row**:

| column          | description                                    |
| --------------- | ---------------------------------------------- |
| `peak_sessions` | the maximum number of simultaneous sessions    |
| `peak_at`       | the earliest timestamp at which it was reached |

If there are no sessions, return `0` and `NULL`.

**Hint:** turn each session into two events, +1 when it starts and −1 when it ends, then keep a
running total.
