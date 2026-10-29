-- Groups by genre without replacing NULL, so the label is NULL instead of 'Uncategorized'
SELECT genre, COUNT(*) AS book_count
FROM books
GROUP BY genre;
