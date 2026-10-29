-- Without DISTINCT, an exam appears once per student who has the runner-up score
WITH ranked AS (
  SELECT exam, score, DENSE_RANK() OVER (PARTITION BY exam ORDER BY score DESC) AS rnk
  FROM exam_scores
)
SELECT exam, score AS runner_up_score FROM ranked WHERE rnk = 2;
