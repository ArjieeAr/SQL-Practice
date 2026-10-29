-- Only checks whether the later-numbered booking starts inside the other one
SELECT a.id AS first_id, b.id AS second_id
FROM bookings a
JOIN bookings b
  ON b.room = a.room AND a.id < b.id
 AND b.starts_at >= a.starts_at AND b.starts_at < a.ends_at;
