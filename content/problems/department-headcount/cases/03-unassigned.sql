-- Employees without a department
INSERT INTO departments (id, name) VALUES
  (1, 'Platform'),
  (2, 'Security');

INSERT INTO employees (id, name, department_id) VALUES
  (1, 'Jun',   1),
  (2, 'Kemal', NULL),
  (3, 'Lia',   NULL),
  (4, 'Mo',    2);
