-- Counts only direct reports, not the whole tree below
WITH RECURSIVE levels AS (
  SELECT id, 1 AS level FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, l.level + 1 FROM employees e JOIN levels l ON e.manager_id = l.id
)
SELECT e.id AS employee_id, e.name, l.level,
       (SELECT COUNT(*) FROM employees x WHERE x.manager_id = e.id) AS team_size
FROM employees e JOIN levels l ON l.id = e.id;
