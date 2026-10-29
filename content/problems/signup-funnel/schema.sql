CREATE TABLE events (
  id          int PRIMARY KEY,
  user_id     int NOT NULL,
  event       text NOT NULL CHECK (event IN ('visit', 'signup', 'purchase')),
  occurred_at timestamp NOT NULL
);
