import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import App from '../App';

describe('Reduced Motion and Mobile Navigation', () => {
  it('useReducedMotion respects prefers-reduced-motion matchMedia', () => {
    // Mock matchMedia returning matches: true
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('AnimatedCounter renders immediately without animation when reduced-motion is active', () => {
    render(<AnimatedCounter value={5420} suffix=" kg" />);
    expect(screen.getByText(/5,420 kg/i)).toBeInTheDocument();
  });

  it('toggles mobile drawer navigation on hamburger button click', async () => {
    const user = userEvent.setup();
    render(<App />);

    const menuBtn = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(menuBtn).toBeInTheDocument();

    await user.click(menuBtn);

    // Mobile drawer should be opened
    const drawerTitle = screen.getByText('CNG SmartPlan', { selector: '#drawer-title' });
    expect(drawerTitle).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close drawer' });
    await user.click(closeBtn);

    // Drawer closes
    expect(screen.queryByText('CNG SmartPlan', { selector: '#drawer-title' })).not.toBeInTheDocument();
  });
});
