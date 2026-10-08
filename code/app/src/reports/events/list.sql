-- Every event, newest first
select strftime('%Y-%m', date) as month,
       date, event, venue, format, capacity, registered, attended,
       round(100.0 * attended / registered, 1) as turnout
from events
order by date desc
