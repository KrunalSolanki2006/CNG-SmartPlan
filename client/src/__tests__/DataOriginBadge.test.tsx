import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';

describe('DataOriginBadge Component', () => {
  it('renders synthetic_demo with calibrated series badge styling', () => {
    render(<DataOriginBadge origin="synthetic_demo" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Modeled Series');
    expect(badge.className).toContain('text-[#6D5BD0]');
  });

  it('renders real_public with public directory badge and green styling', () => {
    render(<DataOriginBadge origin="real_public" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Public Directory');
    expect(badge.className).toContain('text-[#15803D]');
  });

  it('renders illustrative_scenario with scenario projection badge and blue styling', () => {
    render(<DataOriginBadge origin="illustrative_scenario" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Scenario Projection');
    expect(badge.className).toContain('text-[#2563EB]');
  });

  it('renders user_entered_scenario with user parameter badge and amber styling', () => {
    render(<DataOriginBadge origin="user_entered_scenario" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('User Parameter');
    expect(badge.className).toContain('text-[#B45309]');
  });

  it('includes descriptive title attribute for tooltips', () => {
    render(<DataOriginBadge origin="synthetic_demo" showTooltip={true} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toContain('Calibrated time-series model');
  });
});
