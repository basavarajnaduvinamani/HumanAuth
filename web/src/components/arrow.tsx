type Direction = "right" | "external" | "down";

const paths: Record<Direction, string> = {
  right: "M4 10h12m-5-5 5 5-5 5",
  external: "M5 15 15 5M5 5h10v10",
  down: "M10 4v12m-5-5 5 5 5-5",
};

export function Arrow({ direction = "right" }: { direction?: Direction }) {
  return (
    <svg
      className="action-arrow"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[direction]} />
    </svg>
  );
}
