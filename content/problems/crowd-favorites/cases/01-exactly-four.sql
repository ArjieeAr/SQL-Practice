-- An average of exactly 4.0, and remakes that share a title
INSERT INTO movies (id, title, released_year) VALUES
  (1, 'Solaris',        1972),
  (2, 'Solaris',        2002),
  (3, 'Borrowed Light', 2018),
  (4, 'Glasshouse',     2020);

INSERT INTO ratings (movie_id, user_id, stars) VALUES
  (1, 1, 5), (1, 2, 5), (1, 3, 4),
  (2, 1, 2), (2, 2, 3), (2, 4, 3),
  (3, 1, 4), (3, 3, 4), (3, 5, 4),
  (4, 2, 5), (4, 4, 3), (4, 5, 4), (4, 6, 3);
