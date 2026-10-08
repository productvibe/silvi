-- Active members per gender, as a share of all active members
select gender,
       round(100.0 * count(*) / (select count(*) from members where status = 'active'), 1) as share,
       count(*) || ' members' as members
from members
where status = 'active'
group by 1
order by count(*) desc
