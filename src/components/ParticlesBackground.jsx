// src/components/ParticlesBackground.jsx
import React from 'react';
import { Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/engine';

const ParticlesBackground = () => {
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        particles: {
          number: { value: 60 },
          color: { value: '#d1e8ff' },
          opacity: { value: 0.15 },
          size: { value: 50 },
          move: {
            enable: true,
            speed: 0.3,
            direction: 'top',
            outModes: { default: 'out' },
          },
          shape: {
            type: 'circle',
          },
        },
        background: {
          color: { value: '#ffffff00' }, // Transparente
        },
      }}
    />
  );
};

export default ParticlesBackground;
