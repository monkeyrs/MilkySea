export type DiagramDirection = 'TD' | 'LR';

export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
}

export interface DiagramModel {
  id: string;
  direction: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface MermaidBlockRecord {
  id: string;
  index: number;
  code: string;
  start: number;
  end: number;
  diagram: DiagramModel;
}
