export interface LaidPoint {
  x: number;
  y: number;
  level?: number;
  column?: number;
}

export interface AutoGraphLayout {
  algorithm: string;
  spacing: { x: number; y: number };
  bounds: { width: number; height: number };
  points: Record<string, LaidPoint>;
  ports: Record<string, LaidPoint>;
}

export interface InlinedSolution {
  id: string;
  format: 'fmaze-solution-v0';
  maze?: string;
  logic?: string;
  expects_goal?: boolean;
  steps: Array<
    | { transition_id: string; note?: string }
    | { proof_edge_id: string; note?: string }
    | { prove_edge_id: string; note?: string }
  >;
}

export interface VisualAsset {
  id: string;
  href: string;
  media_type: string;
  role?: string;
}

export interface BrowserPackage {
  format: 'fmaze-browser-v0';
  id: string;
  title: string;
  primary_authoring: 'port_graph' | 'fractal_block_pattern' | 'repeated_tile_ports' | 'reference_record';
  source_root: string;
  logic: Record<string, unknown> & {
    id: string;
    strategy: string;
    source_model: string;
    start: string;
    goals: string[];
  };
  solutions?: InlinedSolution[];
  visual?: Record<string, unknown> | null;
  visual_assets?: VisualAsset[];
  auto_graph_layout?: AutoGraphLayout | null;
  modeling_status?: { status: string; reason?: string; next_step?: string } | null;
  provenance?: Record<string, unknown> | null;
}
