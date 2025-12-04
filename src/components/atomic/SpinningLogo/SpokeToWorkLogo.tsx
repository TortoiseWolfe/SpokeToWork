import React from 'react';
import Image from 'next/image';

export interface SpokeToWorkLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const SpokeToWorkLogo: React.FC<SpokeToWorkLogoProps> = ({
  className = 'w-full h-full',
  width = 400,
  height = 400,
}) => {
  return (
    <Image
      src="/spoketowork-logo.svg"
      alt="SpokeToWork Logo"
      width={width}
      height={height}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      priority
    />
  );
};

SpokeToWorkLogo.displayName = 'SpokeToWorkLogo';
