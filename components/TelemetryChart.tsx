import React from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer, XAxis } from 'recharts';
import { ControllerData } from '../types';

interface TelemetryChartProps {
  data: ControllerData[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data }) => {
  return (
    <div className="h-32 w-full bg-slate-900/50 rounded-lg border border-slate-700 p-2">
      <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-mono">Live Telemetry (Gyro)</h3>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data}>
          <YAxis domain={[-90, 90]} hide />
          <XAxis dataKey="timestamp" hide />
          <Line 
            type="monotone" 
            dataKey="x" 
            stroke="#06b6d4" 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false} 
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#f472b6" 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false} 
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-between px-2 text-[10px] font-mono text-slate-500">
        <span className="text-cyan-400">ROLL (X)</span>
        <span className="text-pink-400">PITCH (Y)</span>
      </div>
    </div>
  );
};
