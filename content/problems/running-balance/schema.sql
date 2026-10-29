CREATE TABLE transactions (
  id         int PRIMARY KEY,
  account_id int NOT NULL,
  posted_at  timestamp NOT NULL,
  amount     numeric(12, 2) NOT NULL
);
