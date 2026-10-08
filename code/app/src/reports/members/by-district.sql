-- Active members per district, and the share each district is of them
select district,
       count(*) as members,
       round(100.0 * count(*) / (select count(*) from members where status = 'active'), 1) as share,
       sum(joined >= date('now', '-12 months')) as joined_year
from members
where status = 'active'
group by 1
order by 2 desc
