-- Visitors and sessions per month and page
select month, page,
       sum(visitors) as visitors,
       sum(sessions) as sessions
from website_visits
group by 1, 2
