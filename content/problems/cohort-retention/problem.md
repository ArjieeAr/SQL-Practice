Group users into **cohorts** by the calendar month they signed up in. A user is **retained** if
they were active at least once during the **calendar month right after** their signup month.
Activity in the signup month itself, or two or more months later, doesn't count.

### Output

| column          | description                                                |
| --------------- | ---------------------------------------------------------- |
| `cohort_month`  | first day of the signup month, as a `date`                 |
| `cohort_size`   | users who signed up that month                             |
| `retained`      | how many of them were retained                             |
| `retention_pct` | `retained / cohort_size × 100`, rounded to 1 decimal place |

Include every cohort, even if nobody was retained. Sort by `cohort_month`.
