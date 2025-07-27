/**
 * A base 36 string generator which returns strings with a vague uniqueness for
 * the purpose of using a limited pool of random strings - i.e. mock IDs.
 */
export function randomString36() {
  return (Math.random() * 21_990_232_555_520)
    .toString(36)
    .replace('.', '')
    .substring(0, 8)
    .padStart(8, '0');
}
