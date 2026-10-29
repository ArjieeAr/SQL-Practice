WITH RECURSIVE reports AS (
  -- Every (manager, report) pair at any distance, plus each employee paired with themselves.
  SELECT id AS ancestor_id, id AS descendant_id
  FROM employees
  UNION ALL
  SELECT r.ancestor_id, e.id
  FROM reports r
  JOIN employees e ON e.manager_id = r.descendant_id
)
SELECT e.id AS employee_id,
       e.name,
       (SELECT COUNT(*) FROM reports r WHERE r.descendant_id = e.id) AS level,
       (SELECT COUNT(*) FROM reports r WHERE r.ancestor_id = e.id) - 1 AS team_size
FROM employees e;
