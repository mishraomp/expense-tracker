import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAuthInit } from '@/stores/hooks';
import { useAuthStore } from '@/stores/auth';

describe('hooks', () => {
  it('useAuthInit calls initKeycloak and cleanup stops token refresh', () => {
    let initCalled = false;
    let stopped = false;
    useAuthStore.setState({
      initKeycloak: async () => {
        initCalled = true;
        return true;
      },
      stopTokenRefresh: () => {
        stopped = true;
      },
    });

    function TestComp() {
      useAuthInit();
      return <div />;
    }

    const { unmount } = render(<TestComp />);
    expect(initCalled).toBe(true);
    unmount();
    expect(stopped).toBe(true);
  });
});
