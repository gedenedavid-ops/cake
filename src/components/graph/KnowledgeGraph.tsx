'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '@/store';
import { SUBJECT_CONFIG, GRAPH_NODE_COLORS } from '@/lib/utils';
import type { GraphNode, Subject } from '@/types';

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

// Tronque un label pour éviter les débordements sur les nœuds
function shortLabel(text: string, max = 14): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function KnowledgeGraph({ onNodeClick }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref stable pour le filtre actif — évite de recréer la simulation à chaque clic
  const filterRef = useRef<string | null>(null);
  const { notes, setGraphFilter, graphFilterNodeId } = useStore();
  const [hoveredNode, setHoveredNode] = useState<{ id: string; label: string; x: number; y: number } | null>(null);

  // Garde filterRef synchronisé sans déclencher le useEffect de simulation
  useEffect(() => {
    filterRef.current = graphFilterNodeId;
  }, [graphFilterNodeId]);

  const buildGraphData = useCallback(() => {
    const nodes: GraphDatum[] = [];
    const links: LinkDatum[] = [];
    const nodeMap = new Map<string, GraphDatum>();

    const subjectsInNotes = new Set(notes.map((n) => n.subject));

    // Nœuds matières
    subjectsInNotes.forEach((subject) => {
      const config = SUBJECT_CONFIG[subject as Subject];
      if (!config) return;
      const node: GraphDatum = {
        id: subject,
        label: `${config.emoji} ${shortLabel(subject, 16)}`,
        type: 'subject',
        subject: subject as Subject,
        color: config.color,
        size: 22,
        noteIds: notes.filter((n) => n.subject === subject).map((n) => n.id),
      };
      nodes.push(node);
      nodeMap.set(subject, node);
    });

    // Nœuds concepts (tags)
    const tagCounts = new Map<string, number>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        tagCounts.set(tag.label, (tagCounts.get(tag.label) ?? 0) + 1);
      });
    });

    tagCounts.forEach((count, tagLabel) => {
      const node: GraphDatum = {
        id: `tag:${tagLabel}`,
        label: `#${shortLabel(tagLabel, 12)}`,
        type: 'concept',
        color: GRAPH_NODE_COLORS.concept,
        size: Math.min(8 + count * 2, 18),
      };
      nodes.push(node);
      nodeMap.set(`tag:${tagLabel}`, node);
    });

    // Liens : matière → tags des notes de cette matière
    notes.forEach((note) => {
      if (!nodeMap.get(note.subject)) return;
      note.tags.forEach((tag) => {
        if (!nodeMap.get(`tag:${tag.label}`)) return;
        const exists = links.some(
          (l) =>
            (l.source === note.subject && l.target === `tag:${tag.label}`) ||
            (l.target === note.subject && l.source === `tag:${tag.label}`)
        );
        if (!exists) links.push({ source: note.subject, target: `tag:${tag.label}`, strength: 0.3 });
      });
    });

    // Nœuds notes épinglées / favorites
    notes.filter((n) => n.isPinned || n.isFavorite).forEach((note) => {
      const node: GraphDatum = {
        id: note.id,
        label: shortLabel(note.title, 18),
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

  // ── Simulation — ne dépend PAS de graphFilterNodeId pour éviter le re-render ──
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const { nodes, links } = buildGraphData();
    if (nodes.length === 0) return;

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<GraphDatum>(nodes)
      .force('link', d3.forceLink<GraphDatum, LinkDatum>(links).id((d) => d.id).distance(100).strength(0.4))
      .force('charge', d3.forceManyBody<GraphDatum>().strength(-280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphDatum>().radius((d) => (d.size ?? 10) + 16));

    // Liens
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#E8E4DF')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    // Groupes de nœuds
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

    // Fond blanc sur les nœuds matière (lisibilité)
    nodeGroup.filter((d) => d.type === 'subject')
      .append('circle')
      .attr('r', (d) => (d.size ?? 22) + 3)
      .attr('fill', 'white')
      .attr('fill-opacity', 0.6);

    // Cercle principal
    const circles = nodeGroup.append('circle')
      .attr('r', (d) => d.size ?? 10)
      .attr('fill', (d) => {
        if (d.type === 'subject') return SUBJECT_CONFIG[d.subject!]?.color ?? '#F4A236';
        if (d.type === 'concept') return '#1A1A1A';
        return '#9B9590';
      })
      .attr('fill-opacity', 0.88)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Labels
    nodeGroup.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.size ?? 10) + 13)
      .attr('font-size', (d) => d.type === 'subject' ? '11px' : '9px')
      .attr('font-weight', (d) => d.type === 'subject' ? '600' : '400')
      .attr('fill', '#1A1A1A')
      .attr('pointer-events', 'none');

    // Fonction pour mettre à jour les styles selon le filtre actif (sans recréer la sim)
    const updateFilterStyles = (activeId: string | null) => {
      circles
        .attr('stroke', (d) => activeId === d.id ? '#F4A236' : 'white')
        .attr('stroke-width', (d) => activeId === d.id ? 3.5 : 2)
        .attr('fill-opacity', (d) => {
          if (!activeId) return 0.88;
          return activeId === d.id ? 1 : 0.35;
        });
      link.attr('stroke-opacity', (d) => {
        if (!activeId) return 1;
        const src = typeof d.source === 'string' ? d.source : (d.source as GraphDatum).id;
        const tgt = typeof d.target === 'string' ? d.target : (d.target as GraphDatum).id;
        return src === activeId || tgt === activeId ? 1 : 0.15;
      });
    };

    // Appliquer le filtre initial (si un filtre était déjà actif avant re-render)
    updateFilterStyles(filterRef.current);

    // Écoute les changements de filtre via un custom event
    const handleFilterChange = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      updateFilterStyles(nodeId);
    };
    svgRef.current?.addEventListener('cake:filter', handleFilterChange);

    // Clic nœud
    nodeGroup.on('click', (event, d) => {
      event.stopPropagation();
      const newFilter = filterRef.current === d.id ? null : d.id;
      filterRef.current = newFilter;
      setGraphFilter(newFilter);
      updateFilterStyles(newFilter);
      onNodeClick?.(d.id, d.label);
    });

    // Hover
    nodeGroup
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        setHoveredNode({ id: d.id, label: d.label, x: event.clientX - rect.left, y: event.clientY - rect.top });
        d3.select<SVGGElement, GraphDatum>(event.currentTarget)
          .select('circle:last-of-type')
          .attr('stroke', '#F4A236')
          .attr('stroke-width', 3);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        d3.select<SVGGElement, GraphDatum>(event.currentTarget)
          .select('circle:last-of-type')
          .attr('stroke', filterRef.current === d.id ? '#F4A236' : 'white')
          .attr('stroke-width', filterRef.current === d.id ? 3.5 : 2);
      });

    // Clic fond → vider le filtre
    svg.on('click', () => {
      filterRef.current = null;
      setGraphFilter(null);
      updateFilterStyles(null);
    });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphDatum).x ?? 0)
        .attr('y1', (d) => (d.source as GraphDatum).y ?? 0)
        .attr('x2', (d) => (d.target as GraphDatum).x ?? 0)
        .attr('y2', (d) => (d.target as GraphDatum).y ?? 0);
      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      svgRef.current?.removeEventListener('cake:filter', handleFilterChange);
    };
  // graphFilterNodeId intentionnellement exclu — les styles sont gérés en interne via filterRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, buildGraphData, setGraphFilter, onNodeClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      {hoveredNode && (
        <div
          className="graph-tooltip"
          style={{ left: hoveredNode.x + 14, top: hoveredNode.y - 10 }}
        >
          {hoveredNode.label}
        </div>
      )}
    </div>
  );
}
