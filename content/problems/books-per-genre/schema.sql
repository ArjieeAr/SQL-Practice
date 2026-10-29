CREATE TABLE books (
  id             int PRIMARY KEY,
  title          text NOT NULL,
  genre          text, -- NULL until a librarian assigns one
  published_year int
);
