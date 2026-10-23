begin;

-- Keep self-read behavior while avoiding per-row auth.uid() evaluation and
-- removing overlapping permissive SELECT policies on public.users.
drop policy if exists "admin all" on public.users;
drop policy if exists "self read" on public.users;

create policy "users select self or admin"
  on public.users
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
  );

create policy "users admin insert"
  on public.users
  for insert
  to authenticated
  with check (public.is_admin());

create policy "users admin update"
  on public.users
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "users admin delete"
  on public.users
  for delete
  to authenticated
  using (public.is_admin());

commit;
