WITH ranked AS (
  SELECT exam,
         score,
         DENSE_RANK() OVER (PARTITION BY exam ORDER BY score DESC) AS score_rank
  FROM exam_scores
)
SELECT DISTINCT exam, score AS runner_up_score
FROM ranked
WHERE score_rank = 2;
