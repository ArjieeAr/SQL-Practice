CREATE TABLE sessions (
  id         int PRIMARY KEY,
  user_id    int NOT NULL,
  started_at timestamp NOT NULL,
  ended_at   timestamp NOT NULL,
  CHECK (ended_at > started_at)
);
