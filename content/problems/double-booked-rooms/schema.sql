CREATE TABLE bookings (
  id        int PRIMARY KEY,
  room      text NOT NULL,
  starts_at timestamp NOT NULL,
  ends_at   timestamp NOT NULL,
  CHECK (ends_at > starts_at)
);
