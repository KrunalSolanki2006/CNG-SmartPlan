import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Slider } from '../components/ui/Slider';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Card, CardTitle, CardContent } from '../components/ui/Card';

describe('Reusable UI Components', () => {
  it('renders Button with variants and handles clicks', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button variant="primary" onClick={handleClick}>
        Click Me
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Click Me' });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled Button and prevents click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders IconButton with accessible aria-label', () => {
    render(<IconButton ariaLabel="Settings action">⚙</IconButton>);
    expect(screen.getByRole('button', { name: 'Settings action' })).toBeInTheDocument();
  });

  it('associates Input with label and exposes error message to accessibility tree', () => {
    render(
      <Input
        id="test-input"
        label="Station Name"
        error="Name is required"
        placeholder="Enter station"
      />
    );

    const input = screen.getByLabelText('Station Name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('renders Select with options and triggers change', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    const options = [
      { value: '7', label: '7 Days' },
      { value: '14', label: '14 Days' },
    ];

    render(
      <Select
        id="horizon-select"
        label="Horizon"
        options={options}
        onChange={handleChange}
        defaultValue="7"
      />
    );

    const select = screen.getByLabelText('Horizon');
    expect(select).toBeInTheDocument();
    await user.selectOptions(select, '14');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders Slider with value display', () => {
    render(
      <Slider
        id="test-slider"
        label="Catchment Radius"
        min={1}
        max={10}
        value={3}
        valueDisplay="3.0 km"
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Catchment Radius')).toBeInTheDocument();
    expect(screen.getByText('3.0 km')).toBeInTheDocument();
  });

  it('renders Modal and supports Esc keyboard dismiss', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen={false} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders EmptyState with custom title, message and action', async () => {
    const handleAction = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="No Results Found"
        description="Try adjusting your search criteria."
        actionLabel="Reset Search"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: 'Reset Search' });
    await user.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorState with code, message and retry affordance', async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorState
        code="STATION_NOT_FOUND"
        message="The specified station was not found in the inventory."
        onRetry={handleRetry}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('STATION_NOT_FOUND')).toBeInTheDocument();
    expect(screen.getByText('The specified station was not found in the inventory.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry Request/i });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders Card with header and content', () => {
    render(
      <Card>
        <CardTitle>Card Title Text</CardTitle>
        <CardContent>Body text</CardContent>
      </Card>
    );

    expect(screen.getByText('Card Title Text')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });
});
