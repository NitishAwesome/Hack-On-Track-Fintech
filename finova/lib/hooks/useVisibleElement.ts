'use client';
import { useEffect, useRef, useState } from 'react';

export function useVisibleElement<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '80px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}
