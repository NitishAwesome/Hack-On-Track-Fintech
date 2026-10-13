'use client';
import { useEffect, useState } from 'react';

export function useDisplayMetric() {
  const [metric, setMetric] = useState<'percent' | 'absolute'>('percent');
  useEffect(() => {
    const update = () => {
      try { setMetric(localStorage.getItem('finova_default_metric') === 'absolute' ? 'absolute' : 'percent'); } catch { /* Default remains usable without storage. */ }
    };
    update();
    window.addEventListener('storage', update);
    window.addEventListener('finova-preferences', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('finova-preferences', update); };
  }, []);
  return metric;
}
