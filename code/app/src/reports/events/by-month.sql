-- Events and attendees per month
select strftime('%Y-%m', date) as month,
       count(*) as events,
       sum(registered) as registered,
       sum(attended) as attended
from events
group by 1
order by 1
