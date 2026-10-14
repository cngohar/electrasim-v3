import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('contains focus, closes on Escape, and restores the previous focus', async () => {
    const onClose = vi.fn();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const view = render(
      <Modal open onClose={onClose} title="Test dialog">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );

    const last = screen.getByRole('button', { name: 'Last' });
    const panel = screen.getByRole('dialog').querySelector<HTMLElement>('[tabindex="-1"]')!;
    await waitFor(() => expect(panel).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');

    // The first focusable control is the header close button; the trap wraps
    // backward from it to the last control and forward again (jsdom performs
    // no native tab traversal, so only boundary wrapping is observable).
    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    closeButton.focus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    // The visible header close button also closes the dialog.
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    trigger.remove();
  });

  it('tracks the latest close callback without restarting dialog focus', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();

    function Harness() {
      const [updated, setUpdated] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setUpdated(true)}>
            Update callback
          </button>
          <Modal open onClose={updated ? secondClose : firstClose} title="Callback dialog">
            Content
          </Modal>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Update callback' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledOnce();
  });
  it('dismisses only the top dialog and keeps the parent focus and scroll lock', async () => {
    function Nested() {
      const [child, setChild] = useState(false);
      return (
        <Modal open onClose={() => undefined} title="Parent">
          <button type="button" onClick={() => setChild(true)}>
            Edit source
          </button>
          <Modal open={child} onClose={() => setChild(false)} title="Source review">
            <input aria-label="Draft voltage" />
          </Modal>
        </Modal>
      );
    }
    const view = render(<Nested />);
    const trigger = screen.getByRole('button', { name: 'Edit source' });
    trigger.focus();
    fireEvent.click(trigger);
    const child = screen.getByRole('dialog', { name: 'Source review' });
    await waitFor(() => expect(child.querySelector('[tabindex="-1"]')).toHaveFocus());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Source review' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Parent' })).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    expect(trigger).toHaveFocus();
    view.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
