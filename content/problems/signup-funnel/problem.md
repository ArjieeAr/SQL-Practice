A product tracks three funnel steps per user: `visit`, then `signup`, then `purchase`. Events can
be logged out of order, and a step only counts if it happened **at or after** the user completed
the previous step:

- **visit**: the user has at least one visit. Their visit time is their first visit.
- **signup**: the user has a signup at or after their visit time. Their signup time is the first
  such signup.
- **purchase**: the user has a purchase at or after their signup time.

Count how many users reached each step.

### Output

| column  | description                                      |
| ------- | ------------------------------------------------ |
| `step`  | `'visit'`, `'signup'`, or `'purchase'`           |
| `users` | number of users who reached that step (can be 0) |

Always return all three steps, in funnel order: visit, signup, purchase.
