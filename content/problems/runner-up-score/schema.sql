CREATE TABLE exam_scores (
  student_id int NOT NULL,
  exam       text NOT NULL,
  score      int NOT NULL,
  PRIMARY KEY (student_id, exam)
);
