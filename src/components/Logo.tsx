/**
 * The brand mark. Sourced from `public/al-logo.svg` so the asset can be
 * replaced without touching code — see the note inside that file.
 */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <img
      className="logo"
      src="al-logo.svg"
      width={size}
      height={size}
      alt="Alpha Lion Markets"
    />
  );
}
