-- Function: called when a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (
    id,
    tenant_id,
    email,
    full_name,
    role,
    onboarding_status,
    created_at,
    updated_at
  ) values (
    new.id,
    'a1b2c3d4-0000-0000-0000-000000000001',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'employee',
    'not_started',
    now(),
    now()
  );

  insert into public.employee_profiles (
    user_id,
    tenant_id,
    xp_total,
    current_level,
    onboarding_day,
    created_at,
    updated_at
  ) values (
    new.id,
    'a1b2c3d4-0000-0000-0000-000000000001',
    0,
    'junior',
    1,
    now(),
    now()
  );

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
