-- Update kpi_role_weights to 4-category framework (30/30/20/20)
UPDATE kpi_role_weights SET
  job_performance = 30,
  competency = 30,
  teamwork = 20,
  leadership = 20,
  creativity = 0
WHERE role IN ('director', 'production', 'strategy');
