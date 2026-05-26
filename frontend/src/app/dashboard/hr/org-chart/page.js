'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Color map for roles
const ROLE_COLORS = {
  'Admin':   '#7c3aed',
  'HR Manager': '#be185d',
  'Manager':    '#1d4ed8',
  'Employee':   '#065f46',
};

const NODE_W = 180;
const NODE_H = 72;
const H_GAP = 40;
const V_GAP = 80;

function calcLayout(node, depth = 0, offsetX = 0) {
  const children = node.children || [];
  if (children.length === 0) {
    return { ...node, x: offsetX, y: depth * (NODE_H + V_GAP), width: NODE_W, subtreeWidth: NODE_W };
  }

  let cursor = offsetX;
  const laid = children.map(child => {
    const l = calcLayout(child, depth + 1, cursor);
    cursor += l.subtreeWidth + H_GAP;
    return l;
  });

  const subtreeWidth = cursor - offsetX - H_GAP;
  const firstChild = laid[0];
  const lastChild = laid[laid.length - 1];
  const x = (firstChild.x + lastChild.x) / 2;

  return { ...node, x, y: depth * (NODE_H + V_GAP), width: NODE_W, subtreeWidth, children: laid };
}

function getAllNodes(node, nodes = [], edges = []) {
  nodes.push(node);
  (node.children || []).forEach(child => {
    edges.push({ from: node, to: child });
    getAllNodes(child, nodes, edges);
  });
  return { nodes, edges };
}

function OrgNode({ node, onClick }) {
  const color = ROLE_COLORS[node.role] || '#6b7280';
  const initials = node.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <g transform={`translate(${node.x - NODE_W / 2}, ${node.y})`} onClick={() => onClick(node)} style={{ cursor: node.id !== 'root' ? 'pointer' : 'default' }}>
      <rect width={NODE_W} height={NODE_H} rx={12} ry={12}
        fill="#fff" stroke={color} strokeWidth={1.5}
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))' }} />
      <circle cx={28} cy={NODE_H / 2} r={18} fill={`${color}22`} />
      <text x={28} y={NODE_H / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>{initials}</text>
      <text x={52} y={NODE_H / 2 - 6} fontSize={12} fontWeight={600} fill="#1a1a1a" dominantBaseline="middle">
        {node.name?.split(' ')[0]} {node.name?.split(' ')[1]?.[0]}.
      </text>
      <text x={52} y={NODE_H / 2 + 12} fontSize={10} fill="#9ca3af">{node.role}</text>
    </g>
  );
}

export default function OrgChart() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const svgRef = useRef();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/org-chart')
      .then(r => r.json())
      .then(d => { setTree(d.tree); })
      .catch(() => setError('Failed to load org chart'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Building org chart...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  if (!tree) return null;

  const laid = calcLayout(tree, 0, NODE_W / 2);
  const { nodes, edges } = getAllNodes(laid);

  const svgWidth = Math.max(laid.subtreeWidth + NODE_W, 800);
  const svgHeight = (nodes.reduce((m, n) => Math.max(m, n.y), 0)) + NODE_H + 40;

  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Org Chart</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Click any node to view that employee's profile.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <svg ref={svgRef} width={svgWidth} height={svgHeight} style={{ display: 'block', minWidth: 600 }}>
          {/* Draw edges */}
          {edges.map((e, i) => {
            if (e.from.id === 'root') return null;
            const x1 = e.from.x;
            const y1 = e.from.y + NODE_H;
            const x2 = e.to.x;
            const y2 = e.to.y;
            const midY = (y1 + y2) / 2;
            return (
              <path key={i}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none" stroke="#e5e7eb" strokeWidth={1.5} />
            );
          })}
          {/* Draw nodes */}
          {nodes.map(n => {
            if (n.id === 'root') return null;
            return (
              <OrgNode key={n.id} node={n} onClick={node => {
                if (node.id !== 'root') router.push(`/dashboard/hr/directory/${node.id}`);
              }} />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#4b5563' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />{role}
          </div>
        ))}
      </div>
    </div>
  );
}
