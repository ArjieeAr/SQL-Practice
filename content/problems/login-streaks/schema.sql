CREATE TABLE logins (
  id           int PRIMARY KEY,
  user_id      int NOT NULL,
  logged_in_at timestamp NOT NULL
);
