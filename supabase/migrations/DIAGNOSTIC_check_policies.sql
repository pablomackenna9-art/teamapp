-- Run this SELECT and paste me the full result table
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename in ('teams', 'team_members')
order by tablename, policyname;
