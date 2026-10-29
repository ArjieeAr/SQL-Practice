-- COUNT(genre) skips NULLs, so the Uncategorized group counts 0
SELECT COALESCE(genre, 'Uncategorized') AS genre, COUNT(genre) AS book_count
FROM books
GROUP BY genre;
