-- New members per month, over the last two years
select strftime('%Y-%m', joined) as month,
       count(*) as joined
from members
where joined >= date('now', 'start of month', '-23 months')
group by 1
order by 1
