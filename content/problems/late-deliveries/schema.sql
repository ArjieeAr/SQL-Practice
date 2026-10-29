CREATE TABLE deliveries (
  id           int PRIMARY KEY,
  order_ref    text NOT NULL,
  promised_on  date NOT NULL,
  delivered_on date -- NULL while still in transit
);
