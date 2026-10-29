CREATE TABLE users (
  id           int PRIMARY KEY,
  signed_up_on date NOT NULL
);

CREATE TABLE activity (
  user_id   int NOT NULL REFERENCES users (id),
  active_on date NOT NULL
);
