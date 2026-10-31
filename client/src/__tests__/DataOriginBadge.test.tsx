import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataOriginBadge } from '../components/ui/DataOriginBadge';

describe('DataOriginBadge Component', () => {
  it('renders synthetic_demo with appropriate warning symbol and purple badge styling', () => {
    render(<DataOriginBadge origin="synthetic_demo" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('⚠ Synthetic Demo');
    expect(badge.className).toContain('text-[#6D5BD0]');
  });

  it('renders real_public with checkmark symbol and green styling', () => {
    render(<DataOriginBadge origin="real_public" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('✓ Real Public Data');
    expect(badge.className).toContain('text-[#15803D]');
  });

  it('renders illustrative_scenario with tilde symbol and blue styling', () => {
    render(<DataOriginBadge origin="illustrative_scenario" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('~ Illustrative Scenario');
    expect(badge.className).toContain('text-[#2563EB]');
  });

  it('renders user_entered_scenario with pencil symbol and amber styling', () => {
    render(<DataOriginBadge origin="user_entered_scenario" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('✎ User Entry');
    expect(badge.className).toContain('text-[#B45309]');
  });

  it('includes descriptive title attribute for tooltips', () => {
    render(<DataOriginBadge origin="synthetic_demo" showTooltip={true} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toContain('generate_synthetic_data.py');
  });
});
