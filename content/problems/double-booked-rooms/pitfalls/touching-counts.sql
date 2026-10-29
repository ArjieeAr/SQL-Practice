-- <= treats back-to-back bookings as overlapping
SELECT a.id AS first_id, b.id AS second_id
FROM bookings a
JOIN bookings b
  ON b.room = a.room AND a.id < b.id
 AND a.starts_at <= b.ends_at AND b.starts_at <= a.ends_at;
