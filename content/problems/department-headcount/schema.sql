CREATE TABLE departments (
  id   int PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE employees (
  id            int PRIMARY KEY,
  name          text NOT NULL,
  department_id int REFERENCES departments (id) -- NULL if unassigned
);
