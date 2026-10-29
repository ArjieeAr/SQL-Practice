CREATE TABLE movies (
  id            int PRIMARY KEY,
  title         text NOT NULL,
  released_year int NOT NULL
);

CREATE TABLE ratings (
  movie_id int NOT NULL REFERENCES movies (id),
  user_id  int NOT NULL,
  stars    int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  PRIMARY KEY (movie_id, user_id)
);
