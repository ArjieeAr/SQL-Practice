INSERT INTO movies (id, title, released_year) VALUES
  (1, 'The Lantern Keeper', 2019),
  (2, 'Static Bloom',       2021),
  (3, 'North of Nowhere',   2016),
  (4, 'Paper Tigers',       2023);

INSERT INTO ratings (movie_id, user_id, stars) VALUES
  (1, 101, 5), (1, 102, 4), (1, 103, 4), (1, 104, 5),
  (2, 101, 3), (2, 105, 4), (2, 106, 2),
  (3, 102, 5), (3, 107, 5),
  (4, 101, 4), (4, 103, 5), (4, 108, 4);
