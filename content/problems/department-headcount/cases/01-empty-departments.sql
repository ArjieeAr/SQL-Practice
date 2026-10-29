-- Departments with nobody in them
INSERT INTO departments (id, name) VALUES
  (1, 'Sales'),
  (2, 'Support'),
  (3, 'Research'),
  (4, 'Finance');

INSERT INTO employees (id, name, department_id) VALUES
  (1, 'Eli',    1),
  (2, 'Fatima', 1),
  (3, 'Gus',    3),
  (4, 'Hiro',   1),
  (5, 'Ines',   3);
