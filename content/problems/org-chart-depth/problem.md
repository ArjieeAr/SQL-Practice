Each employee has at most one manager (`manager_id`), and reporting lines never loop. People with
no manager are at the top of their own reporting tree (there may be several trees).

For every employee, find:

- their **level**: people with no manager are level 1, their direct reports are level 2, and so on
- their **team size**: the number of people who report to them, directly or indirectly

### Output

| column        | description                            |
| ------------- | -------------------------------------- |
| `employee_id` | the employee's `id`                    |
| `name`        | the employee's name                    |
| `level`       | depth in the reporting tree (top is 1) |
| `team_size`   | everyone below them in the tree        |

Rows can be in any order.

**Hint:** a recursive CTE can walk the tree.
