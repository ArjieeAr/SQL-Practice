-- COUNT(*) counts the NULL row a LEFT JOIN produces, so empty departments show 1
SELECT d.name AS department, COUNT(*) AS headcount
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name;
