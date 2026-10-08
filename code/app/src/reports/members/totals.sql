-- Members now, and who joined in the last twelve months
select sum(status = 'active') as active,
       sum(status = 'active' and joined >= date('now', '-12 months')) as joined_year,
       round(100.0 * sum(status = 'lapsed') / count(*), 1) as lapsed_share
from members
