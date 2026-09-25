import test from 'node:test';
import assert from 'node:assert/strict';
import { filterUsers } from '../src/lib/user-filter.ts';

const users = [
  { id: 1, name: 'สมชาย', uid: 'A1B2C3D4' },
  { id: 2, name: 'Som', uid: 'DEADBEEF' },
];

test('empty search shows every user', () => {
  assert.deepEqual(filterUsers(users, '  '), users);
});

test('search matches name or UID regardless of case', () => {
  assert.deepEqual(filterUsers(users, ' som '), [users[1]]);
  assert.deepEqual(filterUsers(users, 'a1b2'), [users[0]]);
});

test('unknown search returns an empty result', () => {
  assert.deepEqual(filterUsers(users, 'not found'), []);
});
