import React from 'react';
import Snowfall from 'react-snowfall';
import { useSnowfall } from '../../contexts/SnowfallContext';

const SnowfallEffect = () => {
  const { snowfallEnabled } = useSnowfall();

  if (!snowfallEnabled) {
    return null;
  }

  return (
    <Snowfall
      color="#ffffff"
      snowflakeCount={100}
      speed={[0.5, 2]}
      wind={[-0.5, 1.5]}
      radius={[0.5, 2]}
      style={{
        position: 'fixed',
        width: '100%',
        height: '100%',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
};

export default SnowfallEffect;

