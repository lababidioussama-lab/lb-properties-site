-- Investors engine: read-only search over the workbook tables. Service role only.

create or replace function public.lb_inv_search(p jsonb)
returns jsonb language plpgsql stable set statement_timeout = '12s' set search_path = public, pg_temp as $$
declare
  q        text    := nullif(btrim(lower(coalesce(p->>'q', ''))), '');
  areas    text[]  := (select array_agg(lower(btrim(x))) from jsonb_array_elements_text(coalesce(p->'areas', '[]'::jsonb)) x where btrim(x) <> '');
  bld      text    := nullif(btrim(lower(coalesce(p->>'building', ''))), '');
  nats     text[]  := (select array_agg(btrim(x)) from jsonb_array_elements_text(coalesce(p->'nationalities', '[]'::jsonb)) x where btrim(x) <> '');
  min_p    int     := nullif(p->>'min_props', '')::int;
  max_p    int     := nullif(p->>'max_props', '')::int;
  min_v    numeric := nullif(p->>'min_value', '')::numeric;
  max_v    numeric := nullif(p->>'max_value', '')::numeric;
  mob      boolean := coalesce((p->>'has_mobile')::boolean, false);
  mail     boolean := coalesce((p->>'has_email')::boolean, false);
  sort     text    := coalesce(nullif(p->>'sort', ''), case when areas is not null then 'area_units' else 'value' end);
  dir      text    := case when lower(coalesce(p->>'dir', 'desc')) = 'asc' then 'asc' else 'desc' end;
  size     int     := least(greatest(coalesce((p->>'size')::int, 50), 10), 200);
  pg       int     := greatest(coalesce((p->>'page')::int, 1), 1);
  res jsonb;
begin
  if sort not in ('value', 'units', 'area_units', 'area_value', 'avg', 'communities', 'rank', 'name') then sort := 'value'; end if;
  if areas is null and sort in ('area_units', 'area_value') then sort := 'value'; end if;

  with here as (
    select h.investor_rank, sum(h.units)::int units_here, sum(h.value) value_here
    from inv_holdings h where areas is not null and lower(h.community) = any(areas)
    group by 1
  ),
  m as (
    select i.*, here.units_here, here.value_here
    from inv_investors i
    left join here on here.investor_rank = i.rank
    where (areas is null or here.investor_rank is not null)
      and (q is null or lower(i.name) like '%' || q || '%' or lower(coalesce(i.other_spellings, '')) like '%' || q || '%')
      and (nats is null or i.nationality = any(nats))
      and (min_p is null or i.properties >= min_p) and (max_p is null or i.properties <= max_p)
      and (min_v is null or coalesce(i.total_value, 0) >= min_v) and (max_v is null or coalesce(i.total_value, 0) <= max_v)
      and (not mob or coalesce(i.mobile1, '') <> '') and (not mail or coalesce(i.email, '') <> '')
      and (bld is null or exists (select 1 from inv_properties x where x.investor_rank = i.rank and lower(x.building) like '%' || bld || '%'))
  ),
  ordered as (
    select m.*, row_number() over (order by
      case when dir = 'desc' then case sort
        when 'value' then coalesce(m.total_value, 0) when 'units' then m.properties when 'area_units' then m.units_here
        when 'area_value' then m.value_here when 'avg' then coalesce(m.avg_price, 0) when 'communities' then m.communities
        when 'rank' then -m.rank end end desc nulls last,
      case when dir = 'asc' then case sort
        when 'value' then coalesce(m.total_value, 0) when 'units' then m.properties when 'area_units' then m.units_here
        when 'area_value' then m.value_here when 'avg' then coalesce(m.avg_price, 0) when 'communities' then m.communities
        when 'rank' then -m.rank end end asc nulls last,
      case when sort = 'name' and dir = 'asc' then m.name end asc,
      case when sort = 'name' and dir = 'desc' then m.name end desc,
      coalesce(m.total_value, 0) desc, m.rank) as pos
    from m
  )
  select jsonb_build_object(
    'total', (select count(*) from m),
    'sum_properties', (select coalesce(sum(properties), 0) from m),
    'sum_value', (select coalesce(sum(total_value), 0) from m),
    'sum_units_here', (select coalesce(sum(units_here), 0) from m),
    'sum_value_here', (select coalesce(sum(value_here), 0) from m),
    'sort', sort, 'dir', dir, 'page', pg, 'size', size,
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'pos', o.pos, 'rank', o.rank, 'name', o.name, 'properties', o.properties, 'size_band', o.size_band,
        'communities', o.communities, 'main_community', o.main_community, 'total_value', o.total_value,
        'priced_total', o.priced_total, 'avg_price', o.avg_price, 'nationality', o.nationality,
        'units_here', o.units_here, 'value_here', o.value_here, 'coowned', o.coowned_count,
        'mobile1', o.mobile1, 'has_email', coalesce(o.email, '') <> '',
        'mix', (select jsonb_agg(jsonb_build_object('c', h.community, 'u', h.units) order by h.units desc)
                from (select community, units from inv_holdings where investor_rank = o.rank order by units desc limit 4) h)
      ) order by o.pos) from ordered o where o.pos > (pg - 1) * size and o.pos <= pg * size), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function public.lb_inv_detail(p_rank int)
returns jsonb language sql stable set statement_timeout = '8s' set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'investor', to_jsonb(i) - 'mobile1' - 'mobile2' - 'mobile3' - 'email'
      || jsonb_build_object('mobiles', (select count(*) from unnest(array[i.mobile1, i.mobile2, i.mobile3]) m where coalesce(m, '') <> ''),
                            'mobile1', i.mobile1, 'has_email', coalesce(i.email, '') <> ''),
    'holdings', (select coalesce(jsonb_agg(jsonb_build_object('community', h.community, 'units', h.units, 'value', h.value) order by h.units desc), '[]') from inv_holdings h where h.investor_rank = i.rank),
    'buildings', (select coalesce(jsonb_agg(b order by (b->>'units')::int desc), '[]') from (
        select jsonb_build_object('building', building, 'community', community, 'units', count(*)) b
        from inv_properties where investor_rank = i.rank group by building, community order by count(*) desc limit 12) z),
    'properties', (select coalesce(jsonb_agg(to_jsonb(x) - 'investor_rank' order by x.community, x.building, x.unit), '[]') from (
        select * from inv_properties where investor_rank = i.rank order by community, building, unit limit 1500) x)
  ) from inv_investors i where i.rank = p_rank;
$$;

-- What the screen needs to start: totals, the areas with their figures, the nationalities.
create or replace function public.lb_inv_overview()
returns jsonb language sql stable set statement_timeout = '8s' set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'investors', (select count(*) from inv_investors),
    'properties', (select coalesce(sum(properties), 0) from inv_investors),
    'priced_total', (select coalesce(sum(priced_total), 0) from inv_investors),
    'total_value', (select coalesce(sum(total_value), 0) from inv_investors),
    'club50', (select count(*) from inv_investors where properties >= 50),
    'bands', (select jsonb_agg(jsonb_build_object('band', size_band, 'investors', n, 'properties', u, 'value', v) order by min_p desc)
              from (select size_band, count(*) n, sum(properties) u, sum(total_value) v, min(properties) min_p from inv_investors group by size_band) b),
    'areas', (select jsonb_agg(jsonb_build_object('name', community, 'investors', n, 'units', u, 'value', v) order by u desc)
              from (select community, count(distinct investor_rank) n, sum(units) u, sum(value) v from inv_holdings group by community) a),
    'nationalities', (select jsonb_agg(jsonb_build_object('name', nationality, 'investors', n) order by n desc)
              from (select nationality, count(*) n from inv_investors where length(coalesce(nationality, '')) >= 3 group by 1 having count(*) >= 5) z)
  );
$$;

-- Contacts are released one investor at a time, by the API, which records each release.
create or replace function public.lb_inv_contacts(p_rank int)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object('name', name, 'mobiles', array_remove(array[nullif(mobile1, ''), nullif(mobile2, ''), nullif(mobile3, '')], null), 'email', nullif(email, ''))
  from inv_investors where rank = p_rank;
$$;

revoke all on function public.lb_inv_search(jsonb), public.lb_inv_detail(int), public.lb_inv_overview(), public.lb_inv_contacts(int) from public, anon, authenticated;
grant execute on function public.lb_inv_search(jsonb), public.lb_inv_detail(int), public.lb_inv_overview(), public.lb_inv_contacts(int) to service_role;
