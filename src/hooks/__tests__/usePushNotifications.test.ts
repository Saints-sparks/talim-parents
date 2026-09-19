import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/apiClient', () => ({
  api: {
    delete: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
    post: vi.fn(),
  },
}));
vi.mock('../../services/auth.services', () => ({ useAuth: () => ({ user: null, parentId: null }) }));

import { api } from '../../lib/apiClient';
import { unsubscribeWebPushOnLogout } from '../usePushNotifications';

const unsubscribe = vi.fn().mockResolvedValue(true);

/** Pretends this browser supports push and holds (or lacks) one subscription. */
function stubPush(endpoint: string | null): void {
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
  Object.defineProperty(window, 'Notification', { value: class {}, configurable: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(endpoint ? { endpoint, unsubscribe } : null),
        },
      }),
    },
  });
}

describe('unsubscribeWebPushOnLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-arm the resolved values: clearing spies can drop their implementations.
    unsubscribe.mockResolvedValue(true);
    vi.mocked(api.delete).mockResolvedValue({});
    localStorage.clear();
  });

  it('clears the per-user and legacy flags even with no subscription', async () => {
    stubPush(null);
    localStorage.setItem('talim:push-subscribed:p1', 'true');
    localStorage.setItem('talim:push-subscribed', 'true');

    await unsubscribeWebPushOnLogout('p1');

    expect(localStorage.getItem('talim:push-subscribed:p1')).toBeNull();
    expect(localStorage.getItem('talim:push-subscribed')).toBeNull();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('forgets the subscription on the server and in the browser', async () => {
    stubPush('https://push.example/abc');

    await unsubscribeWebPushOnLogout('p1');

    expect(unsubscribe).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledTimes(1);
    const [path, config] = vi.mocked(api.delete).mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/notifications/web-push/subscribe');
    expect(JSON.parse(String(config.body))).toEqual({ endpoint: 'https://push.example/abc' });
  });

  it('never throws, so sign-out cannot fail because of push cleanup', async () => {
    stubPush('https://push.example/abc');
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('offline'));

    await expect(unsubscribeWebPushOnLogout('p1')).resolves.toBeUndefined();
  });
});
