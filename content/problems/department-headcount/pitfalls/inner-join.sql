-- An inner join drops departments with no employees
SELECT d.name AS department, COUNT(*) AS headcount
FROM departments d
JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name;
