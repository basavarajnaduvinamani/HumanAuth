export function PipelineMobile() {
  return (
    <svg
      className="pipeline-mobile"
      viewBox="0 0 340 320"
      role="img"
      aria-labelledby="pipeline-mobile-title"
    >
      <title id="pipeline-mobile-title">
        Face, document and voice checks feed a liveness veto, fusion and a
        decision.
      </title>
      <g fill="none" stroke="currentColor">
        <rect x="8" y="10" width="100" height="50" rx="6" />
        <rect x="120" y="10" width="100" height="50" rx="6" />
        <rect x="232" y="10" width="100" height="50" rx="6" />
        <path d="M58 60V85H282V60M170 60V110M170 160V185M170 235V260" />
        <rect x="100" y="110" width="140" height="50" rx="6" />
        <rect x="100" y="185" width="140" height="50" rx="6" />
        <rect x="100" y="260" width="140" height="50" rx="6" />
      </g>
      <g fill="currentColor" textAnchor="middle" fontSize="12">
        <text x="58" y="40">
          Face liveness
        </text>
        <text x="170" y="40">
          Document
        </text>
        <text x="282" y="40">
          Voice match
        </text>
        <text x="170" y="140">
          Liveness veto
        </text>
        <text x="170" y="215">
          Fusion
        </text>
        <text x="170" y="290">
          Decision
        </text>
      </g>
    </svg>
  );
}
