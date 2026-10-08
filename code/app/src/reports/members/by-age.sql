-- Active members per age group
select age_group, count(*) as members
from members
where status = 'active'
group by 1
order by 1
