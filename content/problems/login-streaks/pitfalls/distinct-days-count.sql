-- Counts total active days, not consecutive ones
SELECT user_id, COUNT(DISTINCT logged_in_at::date) AS longest_streak
FROM logins
GROUP BY user_id;
