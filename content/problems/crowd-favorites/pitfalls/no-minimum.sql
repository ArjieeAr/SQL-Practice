-- Forgets the "at least 3 ratings" rule
SELECT m.title, ROUND(AVG(r.stars), 2) AS avg_rating
FROM movies m
JOIN ratings r ON r.movie_id = m.id
GROUP BY m.id, m.title
HAVING AVG(r.stars) >= 4;
