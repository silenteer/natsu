import { test, expect } from '@playwright/test';
import fetch from 'node-fetch';

async function request(subject: string) {
  const resposne = await fetch('http://localhost:8080', {
    method: 'POST',
    headers: {
      'nats-subject': subject,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { name: 'User 01' } }),
  });
  return resposne.status === 200
    ? ((await resposne.json()) as { code: string })
    : { code: resposne.status };
}

test.describe('Security tests', () => {
  test('Attack by subject', async () => {
    expect(await request('.api')).toMatchObject({ code: 400 });
    expect(await request('*.api')).toMatchObject({ code: 400 });
    expect(await request('$api')).toMatchObject({ code: 400 });
    expect(await request('>.api')).toMatchObject({ code: 400 });
    expect(await request('api.')).toMatchObject({ code: 400 });
    expect(await request('api.>')).toMatchObject({ code: 400 });
    expect(await request('api.*')).toMatchObject({ code: 400 });
    expect(await request('abc-xyz')).toMatchObject({ code: 400 });
    expect(await request('abc_xyz.*')).toMatchObject({ code: 400 });
    expect(await request('abc..xyz')).toMatchObject({ code: 400 });
    expect(await request('abc.01.02.03.04.05.06.07.08.09.10')).toMatchObject({
      code: 400,
    });
    expect(await request('api.hello')).toMatchObject({ code: 200 });
  });
});
