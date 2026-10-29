For each exam, find the **runner-up score**: the second-highest _distinct_ score.

If several students tie for the top score, the runner-up score is the next lower score. If several
students share the runner-up score, the exam still appears only once. Exams where everyone got the
same score have no runner-up and are left out.

### Output

| column            | description                       |
| ----------------- | --------------------------------- |
| `exam`            | the exam name                     |
| `runner_up_score` | the second-highest distinct score |

Rows can be in any order.
