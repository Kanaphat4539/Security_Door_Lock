export function filterUsers<T extends { name: string; uid: string }>(users: T[], query: string): T[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return users;
  return users.filter((user) =>
    user.name.toLocaleLowerCase().includes(term) || user.uid.toLowerCase().includes(term),
  );
}
