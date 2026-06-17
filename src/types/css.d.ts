// Ambient declarations so TypeScript accepts CSS imports that Metro resolves at
// build time (global stylesheet side-effects and CSS Modules used on web).
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
