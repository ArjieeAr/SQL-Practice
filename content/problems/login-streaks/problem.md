For each user, find their **longest streak**: the most consecutive calendar days on which they
logged in at least once. Logging in several times on the same day still counts as one day.

### Output

| column           | description                                     |
| ---------------- | ----------------------------------------------- |
| `user_id`        | the user                                        |
| `longest_streak` | length of their longest run of consecutive days |

Include every user who has logged in at least once. Rows can be in any order.

**Hint:** this is a "gaps and islands" problem. For consecutive days, `day - ROW_NUMBER()` stays
constant.
