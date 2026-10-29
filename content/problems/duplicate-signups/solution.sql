SELECT LOWER(email) AS email,
       COUNT(*) AS account_count
FROM accounts
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;
