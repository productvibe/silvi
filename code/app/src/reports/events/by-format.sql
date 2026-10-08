-- Attendees per month and format
select strftime('%Y-%m', date) as month,
       format,
       sum(attended) as attended
from events
group by 1, 2
