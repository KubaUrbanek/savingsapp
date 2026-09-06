import React from 'react';

type MetricProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'highlight';
  className?: string;
};

export function Metric({ label, value, detail, tone = 'neutral', className = '' }: MetricProps) {
  return (
    <div className={`metric metric--${tone} ${className}`.trim()}>
      <span className="metricLabel">{label}</span>
      <strong className="metricValue">{value}</strong>
      {detail && <small className="metricDetail">{detail}</small>}
    </div>
  );
}
