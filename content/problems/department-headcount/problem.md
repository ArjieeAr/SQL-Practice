HR wants a headcount for **every department**, including departments that currently have nobody
in them. Employees who haven't been assigned to a department (`department_id` is `NULL`) aren't
part of any department's headcount.

### Output

| column       | description                             |
| ------------ | --------------------------------------- |
| `department` | the department's name                   |
| `headcount`  | how many employees are in it (can be 0) |

Rows can be in any order.
