// Package Imports
import { useEffect } from 'react';
import { useDemo } from '../common/hooks/useDemo';
import { useStores } from '../common/stores';

// Local Imports
import './Home.css';
import { InnerSection } from './InnerSection';

export function Demo() {
  const demo = useStores(
    useDemo({ role: `${Math.ceil(Math.random() * 1000)}` }),
  );

  useEffect(() => console.log('Demo Updated', demo), [demo]);

  return (
    <div className="card">
      <button onClick={demo.onClick}>Toggle Theme</button>
      <br />
      Current theme is {demo.isMultipleOf4 ? 'dark' : 'light'}
      <br />
      <br />
      <InnerSection />
    </div>
  );
}
