import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import User from '../src/models/User.js';
import { api, authHeader, registerUser, uniqueEmail } from './helpers/api.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/testDb.js';

beforeAll(connectTestDb);
beforeEach(clearTestDb);
afterAll(closeTestDb);

describe('POST /api/auth/register', () => {
  it('creates an account and returns a token plus the user', async () => {
    const { response } = await registerUser({ name: 'Atul' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTypeOf('string');
    expect(response.body.data.user.name).toBe('Atul');
    expect(response.body.data.user.level).toBe(1);
    expect(response.body.data.user.xp).toBe(0);
  });

  it('stores the password only as a bcrypt hash', async () => {
    const { email, password } = await registerUser();

    const user = await User.findOne({ email }).select('+password');
    expect(user.password).toBeTypeOf('string');
    expect(user.password).not.toBe(password);
    // bcrypt hashes always start with $2a/$2b/$2y.
    expect(user.password.startsWith('$2')).toBe(true);
  });

  it('never leaks the password hash in the response', async () => {
    const { response, password } = await registerUser();

    const body = JSON.stringify(response.body);
    expect(body).not.toContain(password);
    expect(response.body.data.user.password).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    const { email } = await registerUser();

    const again = await registerUser({ email });
    expect(again.response.status).toBe(409);
    expect(again.response.body.success).toBe(false);
    expect(again.response.body.message).toMatch(/already exists/i);
  });

  it('rejects mismatched passwords with 422', async () => {
    const response = await api().post('/api/auth/register').send({
      name: 'Atul',
      email: uniqueEmail(),
      password: 'Password123',
      confirmPassword: 'Password124',
    });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/do not match/i);
  });

  it('rejects a short password with 422 and names the field', async () => {
    const response = await api().post('/api/auth/register').send({
      name: 'Atul',
      email: uniqueEmail(),
      password: 'short',
    });

    expect(response.status).toBe(422);
    expect(response.body.details?.[0]?.field).toBe('password');
  });

  it('rejects an invalid email with 422', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({ name: 'Atul', email: 'not-an-email', password: 'Password123' });

    expect(response.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const { email, password } = await registerUser();

    const response = await api().post('/api/auth/login').send({ email, password });
    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTypeOf('string');
  });

  it('accepts the email in any case', async () => {
    const { email, password } = await registerUser();

    const response = await api().post('/api/auth/login').send({ email: email.toUpperCase(), password });
    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const { email } = await registerUser();

    const response = await api().post('/api/auth/login').send({ email, password: 'WrongPassword1' });
    expect(response.status).toBe(401);
  });

  it('gives an identical message for a wrong password and an unknown email', async () => {
    const { email, password } = await registerUser();

    const wrongPassword = await api().post('/api/auth/login').send({ email, password: 'WrongPassword1' });
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ email: uniqueEmail('ghost'), password });

    // Distinguishable messages would turn login into an account-enumeration oracle.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    expect(wrongPassword.status).toBe(unknownEmail.status);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const response = await api().get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const response = await api().get('/api/auth/me').set(authHeader('not.a.real.token'));
    expect(response.status).toBe(401);
  });

  it('returns the signed-in user and a null house before onboarding', async () => {
    const { token, email } = await registerUser();

    const response = await api().get('/api/auth/me').set(authHeader(token));
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.house).toBeNull();
  });
});

describe('PATCH /api/auth/me', () => {
  it('updates the profile', async () => {
    const { token } = await registerUser();

    const response = await api().patch('/api/auth/me').set(authHeader(token)).send({ name: 'Renamed' });
    expect(response.status).toBe(200);
    expect(response.body.data.user.name).toBe('Renamed');
  });

  it('updates notification preferences', async () => {
    const { token } = await registerUser();

    const response = await api()
      .patch('/api/auth/me')
      .set(authHeader(token))
      .send({ notificationPrefs: { chores: false } });

    expect(response.status).toBe(200);
    expect(response.body.data.user.notificationPrefs.chores).toBe(false);
  });
});

describe('PATCH /api/auth/password', () => {
  it('changes the password and invalidates the old one', async () => {
    const { token, email, password } = await registerUser();

    const change = await api()
      .patch('/api/auth/password')
      .set(authHeader(token))
      .send({ currentPassword: password, newPassword: 'BrandNewPass1' });

    expect(change.status).toBe(200);

    const oldLogin = await api().post('/api/auth/login').send({ email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api().post('/api/auth/login').send({ email, password: 'BrandNewPass1' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a wrong current password with 400', async () => {
    const { token } = await registerUser();

    const response = await api()
      .patch('/api/auth/password')
      .set(authHeader(token))
      .send({ currentPassword: 'NotMyPassword1', newPassword: 'BrandNewPass1' });

    expect(response.status).toBe(400);
  });
});

describe('password reset', () => {
  it('returns a generic message and a dev token for a known email', async () => {
    const { email } = await registerUser();

    const response = await api().post('/api/auth/forgot-password').send({ email });
    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/if an account exists/i);
    // EMAIL_DEV_MODE is on in the test env, so the token comes back for testing.
    expect(response.body.data?.devResetToken).toBeTypeOf('string');
  });

  it('does not reveal whether an email is registered', async () => {
    const known = await registerUser();
    const knownResponse = await api().post('/api/auth/forgot-password').send({ email: known.email });
    const unknownResponse = await api()
      .post('/api/auth/forgot-password')
      .send({ email: uniqueEmail('nobody') });

    expect(knownResponse.status).toBe(unknownResponse.status);
    expect(knownResponse.body.message).toBe(unknownResponse.body.message);
  });

  it('resets the password with a valid token and consumes it', async () => {
    const { email, password } = await registerUser();

    const forgot = await api().post('/api/auth/forgot-password').send({ email });
    const token = forgot.body.data.devResetToken;

    const reset = await api()
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'ResetPassword1' });
    expect(reset.status).toBe(200);

    const login = await api().post('/api/auth/login').send({ email, password: 'ResetPassword1' });
    expect(login.status).toBe(200);

    const oldLogin = await api().post('/api/auth/login').send({ email, password });
    expect(oldLogin.status).toBe(401);

    // Single-use: the same token must not work twice.
    const reuse = await api().post('/api/auth/reset-password').send({ token, newPassword: 'AnotherPass1' });
    expect(reuse.status).toBe(400);
  });

  it('rejects a garbage token with 400', async () => {
    const response = await api()
      .post('/api/auth/reset-password')
      .send({ token: 'deadbeefdeadbeefdeadbeef', newPassword: 'AnotherPass1' });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/auth/me', () => {
  it('requires the correct password', async () => {
    const { token } = await registerUser();

    const response = await api().delete('/api/auth/me').set(authHeader(token)).send({ password: 'WrongPass1' });
    expect(response.status).toBe(400);
  });

  it('deletes the account when the password matches', async () => {
    const { token, email, password } = await registerUser();

    const response = await api().delete('/api/auth/me').set(authHeader(token)).send({ password });
    expect(response.status).toBe(200);

    const login = await api().post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(401);
    expect(await User.findOne({ email })).toBeNull();
  });
});
