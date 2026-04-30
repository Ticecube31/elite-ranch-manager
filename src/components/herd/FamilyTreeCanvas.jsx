import React, { useMemo, useRef, useEffect, useState } from 'react';

// ── Color helpers ─────────────────────────────────────────────────────────────
function nodeColors(animal) {
  const alive = animal.status === 'Alive';
  if (animal.sex === 'Female') {
    return {
      fill: alive ? '#F472B6' : '#FBCFE8',       // pink-400 / pink-200
      stroke: alive ? '#DB2777' : '#F9A8D4',      // pink-600 / pink-300
      text: alive ? '#fff' : '#9D174D',
    };
  }
  return {
    fill: alive ? '#60A5FA' : '#BFDBFE',          // blue-400 / blue-200
    stroke: alive ? '#2563EB' : '#93C5FD',        // blue-600 / blue-300
    text: alive ? '#fff' : '#1E40AF',
  };
}

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_W = 130;
const NODE_H = 68;
const NODE_MARGIN_X = 22;   // horizontal gap between sibling nodes
const LANE_PADDING_TOP = 48; // space for lane label
const LANE_HEIGHT = 130;     // height of each yearly swim lane
const CANVAS_PADDING = 40;

// ── Layout logic ──────────────────────────────────────────────────────────────
function buildLayout(animals, allAnimals) {
  if (!animals.length) return { nodes: [], edges: [], width: 0, height: 0, years: [] };

  const years = [...new Set(animals.map(a => a.birth_year).filter(Boolean))].sort((a, b) => a - b);

  // Group animals by birth year
  const byYear = {};
  years.forEach(y => { byYear[y] = []; });
  animals.forEach(a => {
    if (a.birth_year && byYear[a.birth_year]) byYear[a.birth_year].push(a);
  });

  // For each year, group calves by mother_id (or mother_animal_number), then sort groups
  // Unknown-mother animals are placed at end
  const orderedByYear = {};
  years.forEach(y => {
    const yearAnimals = byYear[y];
    const groups = {};
    yearAnimals.forEach(a => {
      const key = a.mother_id || a.mother_animal_number || '__no_mother__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    // Sort groups: known mothers first (alphabetically by key), then unknowns
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '__no_mother__') return 1;
      if (b === '__no_mother__') return -1;
      return a.localeCompare(b);
    });
    const ordered = [];
    sortedKeys.forEach(k => {
      groups[k].sort((a, b) => (a.tag_number || '').localeCompare(b.tag_number || ''));
      ordered.push(...groups[k]);
    });
    orderedByYear[y] = ordered;
  });

  // Compute x positions per year row; find max width needed
  const nodeMap = {}; // id -> { x, y, animal }
  let maxX = 0;

  years.forEach((y, yIdx) => {
    const row = orderedByYear[y];
    const yPos = CANVAS_PADDING + LANE_PADDING_TOP + yIdx * LANE_HEIGHT + (LANE_HEIGHT - LANE_PADDING_TOP) / 2 - NODE_H / 2;
    let xCursor = CANVAS_PADDING;

    // Insert small gap between mother groups
    let prevMotherKey = null;
    row.forEach((animal, i) => {
      const key = animal.mother_id || animal.mother_animal_number || '__no_mother__';
      if (prevMotherKey !== null && key !== prevMotherKey) {
        xCursor += 24; // extra gap between mother groups
      }
      prevMotherKey = key;

      const x = xCursor;
      const y2 = yPos;
      nodeMap[animal.id] = { x, y: y2, animal };
      xCursor += NODE_W + NODE_MARGIN_X;
      if (xCursor > maxX) maxX = xCursor;
    });
  });

  const nodes = Object.values(nodeMap);

  // Build edges: mother → calf (only if mother node is in the layout)
  const edges = [];
  animals.forEach(animal => {
    if (!animal.mother_id && !animal.mother_animal_number) return;
    // Try to find mother in current view
    let motherNode = null;
    if (animal.mother_id) {
      motherNode = nodeMap[animal.mother_id];
    }
    if (!motherNode && animal.mother_animal_number) {
      // fallback: find by tag_number among all animals
      const motherAnimal = allAnimals.find(a => a.tag_number === animal.mother_animal_number);
      if (motherAnimal) motherNode = nodeMap[motherAnimal.id];
    }
    if (!motherNode) return;
    const childNode = nodeMap[animal.id];
    if (!childNode) return;
    edges.push({ from: motherNode, to: childNode });
  });

  const totalHeight = CANVAS_PADDING * 2 + years.length * LANE_HEIGHT;
  const totalWidth = maxX + CANVAS_PADDING;

  return { nodes, edges, width: totalWidth, height: totalHeight, years };
}

// ── Animal Node (SVG foreign object) ─────────────────────────────────────────
function AnimalNodeSVG({ node, highlight, onNavigate }) {
  const { x, y, animal } = node;
  const colors = nodeColors(animal);
  const isHighlighted = highlight === animal.id;

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={() => onNavigate(animal.id)}
      style={{ cursor: 'pointer' }}
    >
      {/* Highlight ring */}
      {isHighlighted && (
        <rect
          x={-6} y={-6}
          width={NODE_W + 12} height={NODE_H + 12}
          rx={16} ry={16}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={4}
          strokeDasharray="6 3"
        />
      )}

      {/* Card background */}
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={12} ry={12}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isHighlighted ? 3 : 2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
      />

      {/* Tag number */}
      <text
        x={NODE_W / 2} y={26}
        textAnchor="middle"
        fontSize={18}
        fontWeight="900"
        fontFamily="'Outfit', sans-serif"
        fill={colors.text}
      >
        #{animal.tag_number}
      </text>

      {/* Birth year */}
      <text
        x={NODE_W / 2} y={43}
        textAnchor="middle"
        fontSize={11}
        fontWeight="600"
        fontFamily="'Inter', sans-serif"
        fill={colors.text}
        opacity={0.8}
      >
        {animal.birth_year ?? '—'}
      </text>

      {/* Status pill */}
      <rect
        x={(NODE_W - 60) / 2} y={50}
        width={60} height={14}
        rx={7}
        fill="rgba(0,0,0,0.15)"
      />
      <text
        x={NODE_W / 2} y={61}
        textAnchor="middle"
        fontSize={9}
        fontWeight="700"
        fontFamily="'Inter', sans-serif"
        fill={colors.text}
        opacity={0.95}
      >
        {animal.status}
      </text>
    </g>
  );
}

// ── Curved edge ───────────────────────────────────────────────────────────────
function CurvedEdge({ edge }) {
  const { from, to } = edge;
  // Start at bottom-center of mother node, end at top-center of child node
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;

  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="#A78BFA"
      strokeWidth={2}
      strokeOpacity={0.65}
      strokeDasharray={from.y === to.y ? '5 4' : undefined}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FamilyTreeCanvas({ animals, allAnimals, highlightId, zoom, onNavigateToAnimal }) {
  const { nodes, edges, width, height, years } = useMemo(
    () => buildLayout(animals, allAnimals),
    [animals, allAnimals]
  );

  const svgWidth = Math.max(width, 400);
  const svgHeight = Math.max(height, 300);

  return (
    <div className="overflow-auto w-full h-full" style={{ minHeight: 300 }}>
      <svg
        width={svgWidth * zoom}
        height={svgHeight * zoom}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: 'block', transition: 'width 0.2s, height 0.2s' }}
      >
        {/* Year swim lane backgrounds */}
        {years.map((year, i) => {
          const laneY = CANVAS_PADDING + i * LANE_HEIGHT;
          const isEven = i % 2 === 0;
          return (
            <g key={year}>
              <rect
                x={0} y={laneY}
                width={svgWidth} height={LANE_HEIGHT}
                fill={isEven ? '#F9FAFB' : '#F3F4F6'}
                rx={0}
              />
              {/* Year label */}
              <text
                x={12} y={laneY + 22}
                fontSize={13}
                fontWeight="800"
                fontFamily="'Outfit', sans-serif"
                fill="#6B7280"
                opacity={0.7}
              >
                {year}
              </text>
              {/* Lane separator */}
              <line
                x1={0} y1={laneY + LANE_HEIGHT}
                x2={svgWidth} y2={laneY + LANE_HEIGHT}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Edges (drawn first, under nodes) */}
        {edges.map((edge, i) => (
          <CurvedEdge key={i} edge={edge} />
        ))}

        {/* Nodes */}
        {nodes.map(node => (
          <AnimalNodeSVG
            key={node.animal.id}
            node={node}
            highlight={highlightId}
            onNavigate={onNavigateToAnimal}
          />
        ))}
      </svg>
    </div>
  );
}