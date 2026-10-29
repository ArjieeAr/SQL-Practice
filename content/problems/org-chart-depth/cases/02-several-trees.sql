-- Several people at the top, and some with no reports
INSERT INTO employees (id, name, manager_id) VALUES
  (10, 'Hal',    NULL),
  (11, 'Iris',   NULL),
  (12, 'Joao',   10),
  (13, 'Keiko',  10),
  (14, 'Luca',   11),
  (15, 'Mina',   NULL),
  (16, 'Nadia',  13),
  (17, 'Otto',   13);
