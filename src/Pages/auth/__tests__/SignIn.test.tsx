import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '../../../test-utils/render';
import { renderPortal, requestsTo } from '../../../test-utils/portal';
import SignIn, { failureOf } from '../SignIn';
import ForgotPassword from '../ForgotPassword';

vi.setConfig({ testTimeout: 20_000 });

/**
 * Renders a signed-out page against the fixtures.
 *
 * @param ui - The page.
 * @param path - Its route.
 * @returns The render result.
 */
function renderSignedOut(ui: JSX.Element, path: string) {
  return renderPortal(ui, { path, signedOut: true });
}

describe('SignIn', () => {
  it('has the shared look with the Parents pill and the parent copy', () => {
    renderSignedOut(<SignIn />, '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Parents')).toBeInTheDocument();
    expect(screen.getByText("Sign in to track your child's learning journey.")).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('id', 'identifier');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button');
  });

  it('maps a refusal to the banner tone', () => {
    expect(failureOf({ kind: 'access_denied', message: 'x' })).toEqual({ tone: 'danger', title: 'Access denied', message: 'x' });
    expect(failureOf({ kind: 'invalid_credentials', message: 'y' })?.tone).toBe('warning');
    expect(failureOf({ kind: 'unknown', message: 'z' })?.tone).toBe('neutral');
    expect(failureOf({ kind: 'success' })).toBeNull();
  });

  it('says what is missing and focuses the field, without calling the API', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderSignedOut(<SignIn />, '/');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
    expect(requestsTo(fixtures, '/auth/login')).toHaveLength(0);
  });

  it('shows the amber banner for wrong credentials', async () => {
    const user = userEvent.setup();
    renderSignedOut(<SignIn />, '/');
    await user.type(screen.getByLabelText('Email address'), 'saint@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Incorrect email or password/);
  });
});

describe('ForgotPassword', () => {
  it('walks email, code and a new password checked against the policy, in the same look', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderSignedOut(<ForgotPassword />, '/');
    expect(screen.getByText('Parents')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email address'), 'saint@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByRole('heading', { name: 'Enter the code' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('6-digit code'), '000000');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong or has expired/);
    await user.clear(screen.getByLabelText('6-digit code'));
    await user.type(screen.getByLabelText('6-digit code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'weak');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByText("Your new password doesn't meet every rule yet.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'N3w-Passw0rd!');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w-Passw0rd!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('heading', { name: 'Password reset' })).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fixtures, '/auth/reset-password')[0].body).toEqual({ email: 'saint@example.com', token: '123456', newPassword: 'N3w-Passw0rd!' }));
  });
});
