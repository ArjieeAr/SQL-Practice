-- Grouping by title merges remakes into one movie
SELECT m.title, ROUND(AVG(r.stars), 2) AS avg_rating
FROM movies m
JOIN ratings r ON r.movie_id = m.id
GROUP BY m.title
HAVING COUNT(*) >= 3 AND AVG(r.stars) >= 4;
