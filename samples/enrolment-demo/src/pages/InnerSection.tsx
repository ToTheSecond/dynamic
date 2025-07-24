// Package Imports
import { useEffect } from 'react';
import { useAppStore } from '../common/stores';

export function InnerSection() {
  const role = useAppStore((s) => s.state.currentRole);

  useEffect(() => console.log('InnerSection Updated'), [role]);

  return <span>{role}</span>;
}
