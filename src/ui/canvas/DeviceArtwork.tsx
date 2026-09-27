import type { ComponentInstance } from '@electrasim/domain';
import { memo } from 'react';
import { DEVICE_FAMILIES, deviceImage, deviceMarking } from './deviceVectors';

/** State overlays share the body's 64-unit coordinates; the housing never rotates to show ON. */
export const DeviceArtwork = memo(function DeviceArtwork({
  component,
  energized,
  compact,
  animate,
}: {
  component: ComponentInstance;
  energized: boolean;
  compact: boolean;
  animate: boolean;
}) {
  const family = DEVICE_FAMILIES[component.type];
  const image = deviceImage(component.type);
  const on = component.state.on === true && !component.state.isTripped && !component.state.isBlown;
  const tripped = component.state.isTripped === true;
  const marking = deviceMarking(component);
  const isRotor = family === 'motor' || family === 'fan';
  if (!image) return null;
  return (
    <g
      pointerEvents="none"
      data-device-art={component.type}
      data-device-family={family}
      data-device-state={tripped ? 'tripped' : on ? 'on' : energized ? 'energized' : 'off'}
    >
      <svg
        x={19}
        y={0}
        width={62}
        height={59}
        viewBox="0 0 64 64"
        aria-hidden="true"
        overflow="visible"
      >
        <image href={image} width={64} height={64} />
        {component.type === 'bell' && energized && animate && (
          <circle
            className="electrasim-bell-pulse"
            cx={32}
            cy={32}
            r={26}
            fill="none"
            stroke="#d97706"
            strokeWidth={1.5}
          />
        )}
        {(family === 'breaker' || family === 'residual') && (
          <g data-device-actuator transform={`translate(0 ${tripped ? 6 : on ? 0 : 12})`}>
            <rect
              x={24}
              y={19}
              width={16}
              height={10}
              rx={2}
              fill={component.type === 'mccb' ? '#1e293b' : '#2563eb'}
              stroke="#0f172a"
              strokeWidth={0.8}
            />
            <path d="M26 22h12M26 25h12" stroke="#93c5fd" strokeWidth={0.8} />
          </g>
        )}
        {(family === 'rocker' || (family === 'isolator' && component.type === 'main-switch')) && (
          <g data-device-actuator>
            <path
              d={on ? 'M23 15h18v30l-18-4z' : 'M23 18l18-3v26H23z'}
              fill={component.type === 'cooker-unit' ? '#dc2626' : '#f8fafc'}
              stroke="#64748b"
              strokeWidth={1}
            />
            <path
              d={on ? 'M25 18h14' : 'M25 38h14'}
              stroke={on ? '#16a34a' : '#94a3b8'}
              strokeWidth={2}
            />
          </g>
        )}
        {(family === 'knob' || (family === 'isolator' && component.type === 'isolator-switch')) && (
          <g data-device-actuator transform={`rotate(${on ? 45 : -45} 32 31)`}>
            <circle
              cx={32}
              cy={31}
              r={13}
              fill={family === 'isolator' ? '#dc2626' : '#f8fafc'}
              stroke="#64748b"
              strokeWidth={1.3}
            />
            <path
              d="M32 21v8"
              stroke={family === 'isolator' ? '#fff' : '#334155'}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        )}
        {family === 'button' && (
          <circle
            data-device-actuator
            cx={32}
            cy={on ? 32 : 29}
            r={10}
            fill={on ? '#166534' : '#22c55e'}
            stroke="#14532d"
            strokeWidth={1.5}
          />
        )}
        {family === 'contactor' && (
          <rect x={26} y={28} width={12} height={5} rx={1} fill={on ? '#ef4444' : '#64748b'} />
        )}
        {isRotor && (
          <g
            transform={
              family === 'motor'
                ? 'translate(51 33)'
                : component.type === 'ceiling-fan'
                  ? 'translate(32 33)'
                  : 'translate(32 29)'
            }
          >
            <g className={animate && energized ? 'device-rotor' : undefined} data-device-rotor>
              {family === 'motor' ? (
                <path d="M-5 0H5M0-5V5" stroke="#334155" strokeWidth={2} />
              ) : (
                [0, 120, 240].map((angle) => (
                  <path
                    key={angle}
                    transform={`rotate(${angle})`}
                    d="M0-3Q-9-24 0-23Q10-24 5-5Z"
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth={1}
                  />
                ))
              )}
            </g>
            <circle r={family === 'motor' ? 2 : 4} fill="#f8fafc" stroke="#64748b" />
          </g>
        )}
        {family === 'lamp' && energized && !component.state.isBlown && (
          <g fill="#fde047" fillOpacity={0.55}>
            {component.type === 'tube-light' ? (
              <rect x={9} y={25} width={46} height={13} rx={4} />
            ) : component.type === 'led-downlight' ? (
              <ellipse cx={32} cy={33} rx={20} ry={12} />
            ) : component.type === 'bulb' || component.type === 'bulb-smart-rgb' ? (
              <path d="M14 28a18 18 0 1 1 36 0Z" />
            ) : (
              <circle cx={32} cy={25} r={13} />
            )}
          </g>
        )}
      </svg>
      {marking && !compact && (
        <text
          data-device-rating
          x={50}
          y={57}
          textAnchor="middle"
          fontSize={6.7}
          fontFamily="var(--canvas-mono, monospace)"
          fontWeight={650}
          fill="var(--canvas-text, #0f172a)"
          stroke="var(--canvas-surface, #fff)"
          strokeWidth={2.2}
          paintOrder="stroke"
        >
          {marking}
        </text>
      )}
    </g>
  );
});
