CREATE TABLE orders (
  id         int PRIMARY KEY,
  ordered_at timestamp NOT NULL,
  status     text NOT NULL CHECK (status IN ('completed', 'cancelled', 'refunded')),
  total      numeric(10, 2) NOT NULL
);
