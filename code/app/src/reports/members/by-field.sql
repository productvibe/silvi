-- Active members per field of work
select field, count(*) as members
from members
where status = 'active'
group by 1
order by 2 desc
