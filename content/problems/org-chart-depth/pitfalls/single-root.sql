-- Assumes there is exactly one person at the top
WITH RECURSIVE reports AS (
  SELECT id AS ancestor_id, id AS descendant_id FROM employees
  UNION ALL
  SELECT r.ancestor_id, e.id FROM reports r JOIN employees e ON e.manager_id = r.descendant_id
), root AS (
  SELECT id FROM employees WHERE manager_id IS NULL ORDER BY id LIMIT 1
)
SELECT e.id AS employee_id, e.name,
       (SELECT COUNT(*) FROM reports r WHERE r.descendant_id = e.id) AS level,
       (SELECT COUNT(*) FROM reports r WHERE r.ancestor_id = e.id) - 1 AS team_size
FROM employees e
WHERE EXISTS (SELECT 1 FROM reports r, root WHERE r.ancestor_id = root.id AND r.descendant_id = e.id);
