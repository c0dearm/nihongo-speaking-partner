import React from 'react';

interface WaveformVisualizerProps {
  inputRms: number;
  outputRms: number;
  isActive: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  inputRms,
  outputRms,
  isActive,
}) => {
  const level = Math.max(inputRms, outputRms);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {[...Array(9)].map((_, idx) => {
        const factor = 1 - Math.abs(idx - 4) * 0.15;
        const height = isActive ? Math.max(12, level * factor * 56) : 8;
        return (
          <div
            key={idx}
            className="w-1.5 rounded-full bg-indigo-500 transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
