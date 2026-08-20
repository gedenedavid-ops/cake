'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '@/store';
import { SUBJECT_CONFIG, GRAPH_NODE_COLORS, cn } from '@/lib/utils';
import type { GraphNode, GraphLink, Subject } from '@/types';

interface GraphDatum extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface LinkDatum {
  source: GraphDatum | string;
  target: GraphDatum | string;
  strength?: number;
}

interface KnowledgeGraphProps {
  onNodeClick?: (nodeId: string, label: string) => void;
}

export function KnowledgeGraph({ onNodeClick }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, setGraphFilter, graphFilterNodeId } = useStore();
  const [hoveredNode, setHoveredNode] = useState<{ id: string; label: string; x: number; y: number } | null>(null);

  const buildGraphData = useCallback(() => {
    const nodes: GraphDatum[] = [];
    const links: LinkDatum[] = [];
    const nodeMap = new Map<string, GraphDatum>();

    const subjectsInNotes = new Set(notes.map((n) => n.subject));

    // Add subject nodes
    subjectsInNotes.forEach((subject) => {
      const config = SUBJECT_CONFIG[subject as Subject];
      const node: GraphDatum = {
        id: subject,
        label: `${config.emoji} ${subject}`,
        type: 'subject',
        subject: subject as Subject,
        color: SUBJECT_CONFIG[subject as Subject].color,
        size: 20,
        noteIds: notes.filter((n) => n.subject === subject).map((n) => n.id),
      };
      nodes.push(node);
      nodeMap.set(subject, node);
    });

    // Add tag concept nodes and connect to subjects
    const tagCounts = new Map<string, number>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        tagCounts.set(tag.label, (tagCounts.get(tag.label) ?? 0) + 1);
      });
    });

    tagCounts.forEach((count, tagLabel) => {
      if (count < 1) return;
      const node: GraphDatum = {
        id: `tag:${tagLabel}`,
        label: `#${tagLabel}`,
        type: 'concept',
        color: GRAPH_NODE_COLORS.concept,
        size: Math.min(8 + count * 2, 18),
      };
      nodes.push(node);
      nodeMap.set(`tag:${tagLabel}`, node);
    });

    // Links: subject → tags that appear in those subject's notes
    notes.forEach((note) => {
      const subjectNode = nodeMap.get(note.subject);
      if (!subjectNode) return;
      note.tags.forEach((tag) => {
        const tagNode = nodeMap.get(`tag:${tag.label}`);
        if (!tagNode) return;
        const exists = links.some(
          (l) =>
            (l.source === note.subject && l.target === `tag:${tag.label}`) ||
            (l.target === note.subject && l.source === `tag:${tag.label}`)
        );
        if (!exists) links.push({ source: note.subject, target: `tag:${tag.label}`, strength: 0.3 });
      });
    });

    // Add note nodes for featured/pinned notes
    notes.filter((n) => n.isPinned || n.isFavorite).forEach((note) => {
      const node: GraphDatum = {
        id: note.id,
        label: note.title.slice(0, 20) + (note.title.length > 20 ? '…' : ''),
        type: 'note',
        color: GRAPH_NODE_COLORS.note,
        size: 10,
      };
      nodes.push(node);
      nodeMap.set(note.id, node);
      links.push({ source: note.subject, target: note.id, strength: 0.5 });
    });

    return { nodes, links };
  }, [notes]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const { nodes, links } = buildGraphData();
    if (nodes.length === 0) return;

    // Zoom behaviour
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<GraphDatum>(nodes)
      .force('link', d3.forceLink<GraphDatum, LinkDatum>(links).id((d) => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody<GraphDatum>().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphDatum>().radius((d) => (d.size ?? 10) + 14));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#E8E4DF')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    // Node groups
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, GraphDatum>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphDatum>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Node circles
    nodeGroup.append('circle')
      .attr('r', (d) => d.size ?? 10)
      .attr('fill', (d) => {
        if (d.type === 'subject') return SUBJECT_CONFIG[d.subject!]?.color ?? '#F4A236';
        if (d.type === 'concept') return '#1A1A1A';
        return '#9B9590';
      })
      .attr('fill-opacity', (d) => graphFilterNodeId === d.id ? 1 : 0.85)
      .attr('stroke', (d) => graphFilterNodeId === d.id ? '#F4A236' : 'white')
      .attr('stroke-width', (d) => graphFilterNodeId === d.id ? 3 : 1.5);

    // Labels
    nodeGroup.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.size ?? 10) + 12)
      .attr('font-size', (d) => d.type === 'subject' ? '11px' : '9px')
      .attr('font-weight', (d) => d.type === 'subject' ? '600' : '400')
      .attr('fill', '#1A1A1A')
      .attr('pointer-events', 'none');

    // Click handler
    nodeGroup.on('click', (event, d) => {
      event.stopPropagation();
      const newFilter = graphFilterNodeId === d.id ? null : d.id;
      setGraphFilter(newFilter);
      onNodeClick?.(d.id, d.label);
    });

    // Hover
    nodeGroup
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        setHoveredNode({ id: d.id, label: d.label, x: event.clientX - rect.left, y: event.clientY - rect.top });
        d3.select(event.currentTarget).select('circle').attr('stroke', '#F4A236').attr('stroke-width', 2.5);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget).select('circle')
          .attr('stroke', graphFilterNodeId === d.id ? '#F4A236' : 'white')
          .attr('stroke-width', graphFilterNodeId === d.id ? 3 : 1.5);
      });

    // Click on background → clear filter
    svg.on('click', () => { setGraphFilter(null); });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphDatum).x ?? 0)
        .attr('y1', (d) => (d.source as GraphDatum).y ?? 0)
        .attr('x2', (d) => (d.target as GraphDatum).x ?? 0)
        .attr('y2', (d) => (d.target as GraphDatum).y ?? 0);

      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [notes, buildGraphData, graphFilterNodeId, setGraphFilter, onNodeClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      {hoveredNode && (
        <div
          className="graph-tooltip"
          style={{ left: hoveredNode.x + 12, top: hoveredNode.y - 8 }}
        >
          {hoveredNode.label}
        </div>
      )}
    </div>
  );
}
