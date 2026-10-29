-- Perfect scores from too few ratings
INSERT INTO movies (id, title, released_year) VALUES
  (10, 'Hidden Gem',    2024),
  (11, 'Crowd Pleaser', 2022);

INSERT INTO ratings (movie_id, user_id, stars) VALUES
  (10, 1, 5), (10, 2, 5),
  (11, 1, 4), (11, 2, 5), (11, 3, 4), (11, 4, 4);
