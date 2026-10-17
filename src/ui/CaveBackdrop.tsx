// The painted cave (A3) as a backdrop: the painting centred on the seat, its edges mirrored out as
// wings, the two lower corners cut away into the void. Cultivate sits in it; Routine (A4, Jan's
// call) stands in the same place, so the painting doesn't move between the two. Still.
export function CaveBackdrop() {
  return (
    <div className="cultivate-backdrop" aria-hidden="true">
      <div className="cultivate-wing is-left" />
      <div className="cultivate-scene" />
      <div className="cultivate-wing is-right" />
    </div>
  );
}
