-- A long chain of command
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Aiko',    NULL),
  (2, 'Bram',    1),
  (3, 'Celeste', 2),
  (4, 'Dario',   3),
  (5, 'Esme',    4),
  (6, 'Femi',    5),
  (7, 'Greta',   3);
