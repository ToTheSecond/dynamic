import configure from '../../rollup.config';

export default [configure({ path: import.meta.url, peerDependencies: true })];
