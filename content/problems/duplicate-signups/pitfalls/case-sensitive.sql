-- Groups by the raw address, so different capitalizations look unique
SELECT LOWER(email) AS email, COUNT(*) AS account_count
FROM accounts
GROUP BY email
HAVING COUNT(*) > 1;
