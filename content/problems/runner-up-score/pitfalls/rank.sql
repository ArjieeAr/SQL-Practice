-- RANK skips numbers after a tie (1, 1, 3), so there may be no rank 2
WITH ranked AS (
  SELECT exam, score, RANK() OVER (PARTITION BY exam ORDER BY score DESC) AS rnk
  FROM exam_scores
)
SELECT DISTINCT exam, score AS runner_up_score FROM ranked WHERE rnk = 2;
