// The designer's "voice": a soft, slowly turning blob of the brand colours.
export function Orb({ size = 64 }: { size?: number }) {
  return <span className="orb" style={{ width: size, height: size }} aria-hidden="true" />;
}
