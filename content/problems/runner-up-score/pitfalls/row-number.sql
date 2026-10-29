-- ROW_NUMBER breaks ties arbitrarily, so a tie for first returns the top score again
WITH ranked AS (
  SELECT exam, score, ROW_NUMBER() OVER (PARTITION BY exam ORDER BY score DESC) AS rn
  FROM exam_scores
)
SELECT exam, score AS runner_up_score FROM ranked WHERE rn = 2;
