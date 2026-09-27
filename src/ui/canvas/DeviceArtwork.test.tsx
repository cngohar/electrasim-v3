import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeviceArtwork } from './DeviceArtwork';
import { DEVICE_FAMILIES, deviceImage, deviceMarking } from './deviceVectors';

describe('physical device artwork', () => {
  it('covers the complete catalogue with valid self-contained vectors', () => {
    expect(Object.keys(DEVICE_FAMILIES).sort()).toEqual(Object.keys(COMPONENT_DEFS).sort());
    for (const type of Object.keys(COMPONENT_DEFS)) {
      const image = deviceImage(type);
      expect(image, type).toMatch(/^data:image\/svg\+xml/);
      const doc = new DOMParser().parseFromString(
        decodeURIComponent(image!.split(',')[1]),
        'image/svg+xml',
      );
      expect(doc.querySelector('parsererror'), type).toBeNull();
      expect(doc.querySelector('svg')?.getAttribute('viewBox'), type).toBe('0 0 64 64');
      expect(doc.querySelector('[href^="http"]'), type).toBeNull();
    }
  });

  it('uses instance ratings and updates a tripped lever without moving the housing', () => {
    const component: ComponentInstance = {
      id: 'q1',
      type: 'mcb',
      x: 0,
      y: 0,
      state: { on: true, customMaxAmps: 6 },
    };
    const { container, rerender } = render(
      <svg role="img" aria-label="Test circuit">
        <DeviceArtwork component={component} energized compact={false} animate />
      </svg>,
    );
    expect(container.querySelector('[data-device-rating]')?.textContent).toBe('B6 A');
    const image = container.querySelector('image')?.getAttribute('href');
    const position = container.querySelector('[data-device-actuator]')?.getAttribute('transform');
    rerender(
      <svg role="img" aria-label="Test circuit">
        <DeviceArtwork
          component={{ ...component, state: { ...component.state, isTripped: true } }}
          energized={false}
          compact={false}
          animate
        />
      </svg>,
    );
    expect(container.querySelector('[data-device-art]')).toHaveAttribute(
      'data-device-state',
      'tripped',
    );
    expect(container.querySelector('[data-device-actuator]')?.getAttribute('transform')).not.toBe(
      position,
    );
    expect(container.querySelector('image')?.getAttribute('href')).toBe(image);
    expect(
      deviceMarking({ ...component, type: 'water-heater', state: { customPowerWatts: 1800 } }),
    ).toBe('1.8 kW');
  });

  it('keeps recognisable art in dense scenes and animates only the rotor when enabled', () => {
    const component: ComponentInstance = { id: 'm1', type: 'motor', x: 0, y: 0, state: {} };
    const { container, rerender } = render(
      <svg role="img" aria-label="Test circuit">
        <DeviceArtwork component={component} energized compact animate />
      </svg>,
    );
    expect(container.querySelector('image')).not.toBeNull();
    expect(container.querySelector('.device-rotor')).toHaveAttribute('data-device-rotor');
    expect(container.querySelector('image')).not.toHaveAttribute('class');
    rerender(
      <svg role="img" aria-label="Test circuit">
        <DeviceArtwork component={component} energized compact animate={false} />
      </svg>,
    );
    expect(container.querySelector('.device-rotor')).toBeNull();
    expect(container.querySelector('[data-device-rotor]')).not.toBeNull();
  });
});
