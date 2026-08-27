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
});
