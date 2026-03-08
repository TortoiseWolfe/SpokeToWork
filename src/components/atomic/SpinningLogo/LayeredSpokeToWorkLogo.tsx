'use client';

import React from 'react';
import Image from 'next/image';
import { SpinningLogo } from './SpinningLogo';
import { detectedConfig } from '@/config/project-detected';

export interface LayeredSpokeToWorkLogoProps {
  className?: string;
  size?: number;
  speed?: 'slow' | 'normal' | 'fast' | number;
  pauseOnHover?: boolean;
}

export const LayeredSpokeToWorkLogo: React.FC<LayeredSpokeToWorkLogoProps> = ({
  className = '',
  speed = 'slow',
  pauseOnHover = true,
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%',
        aspectRatio: '1 / 1',
      }}
    >
      {/* Rotating wheel only (tire, rim, spokes, hub) */}
      <SpinningLogo speed={speed} pauseOnHover={pauseOnHover}>
        <Image
          src={`${detectedConfig.basePath}/spoketowork-wheel.svg`}
          alt="Spinning Wheel"
          width={400}
          height={400}
          className="absolute inset-0 h-full w-full"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'var(--shadow-brand-sm)',
          }}
          priority
        />
      </SpinningLogo>

      {/* Static text around the wheel (doesn't spin) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <Image
          src={`${detectedConfig.basePath}/spoketowork-text.svg`}
          alt="Spoke To Work"
          width={400}
          height={400}
          className="h-full w-full"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          priority
        />
      </div>

      {/* Static job markers - centered around the wheel */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '127%',
          height: '127%',
          opacity: 0.9,
        }}
      >
        <Image
          src={`${detectedConfig.basePath}/printing-mallet.svg`}
          alt="Job Markers"
          width={400}
          height={400}
          className="h-full w-full"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'var(--shadow-brand)',
          }}
          priority
        />
      </div>

      {/* Static home icon on top */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '67%',
          height: '67%',
        }}
      >
        <Image
          src={`${detectedConfig.basePath}/script-tags.svg`}
          alt="Script Tags"
          width={400}
          height={400}
          className="h-full w-full"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'var(--shadow-brand)',
          }}
          priority
        />
      </div>
    </div>
  );
};

LayeredSpokeToWorkLogo.displayName = 'LayeredSpokeToWorkLogo';
