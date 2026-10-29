SELECT COALESCE(genre, 'Uncategorized') AS genre,
       COUNT(*) AS book_count
FROM books
GROUP BY COALESCE(genre, 'Uncategorized');
