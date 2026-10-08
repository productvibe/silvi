-- Visitors per month, by where they came from
select month,
       sum(visitors) as visitors,
       sum(case when source = 'Search' then visitors end) as search,
       sum(case when source = 'Social' then visitors end) as social,
       sum(case when source = 'Newsletter' then visitors end) as newsletter,
       sum(case when source = 'Direct' then visitors end) as direct,
       sum(sessions) as sessions
from website_visits
group by 1
order by 1
