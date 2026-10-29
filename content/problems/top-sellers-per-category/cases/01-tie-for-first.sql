-- Two products tie for first place
INSERT INTO products (id, name, category) VALUES
  (1, 'Graph Paper',  'Paper'),
  (2, 'Sketchbook',   'Paper'),
  (3, 'Sticky Notes', 'Paper'),
  (4, 'Gel Pen',      'Pens'),
  (5, 'Fountain Pen', 'Pens'),
  (6, 'Marker',       'Pens');

INSERT INTO sales (id, product_id, quantity, sold_on) VALUES
  (1, 1, 10, '2025-03-01'),
  (2, 2,  6, '2025-03-01'),
  (3, 2,  4, '2025-03-02'),
  (4, 3,  9, '2025-03-02'),
  (5, 4, 20, '2025-03-03'),
  (6, 5, 15, '2025-03-03'),
  (7, 6, 11, '2025-03-04');
