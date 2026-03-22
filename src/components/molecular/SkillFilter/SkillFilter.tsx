'use client';

/**
 * SkillFilter — dropdown checklist of the skills taxonomy tree.
 * Mirrors IndustryFilter exactly: same props shape, same a11y pattern.
 */

import type { SkillTreeNode } from '@/hooks/useSkills';

export interface SkillFilterProps {
  tree: SkillTreeNode[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function Row({
  node,
  depth,
  selected,
  onToggle,
}: {
  node: SkillTreeNode;
  depth: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { node: item, children } = node;
  return (
    <>
      <label
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 hover:bg-base-200"
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
      >
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={selected.has(item.id)}
          onChange={() => onToggle(item.id)}
          aria-label={item.name}
        />
        <span className="text-sm">{item.name}</span>
      </label>
      {children.map((c) => (
        <Row key={c.node.id} node={c} depth={depth + 1} selected={selected} onToggle={onToggle} />
      ))}
    </>
  );
}

export function SkillFilter({ tree, selected, onChange }: SkillFilterProps) {
  const selSet = new Set(selected);
  const toggle = (id: string) => {
    const next = new Set(selSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <details className="dropdown">
      <summary className="btn btn-sm btn-outline min-h-11">
        Trade
        {selected.length > 0 && (
          <span className="badge badge-primary badge-sm">{selected.length}</span>
        )}
      </summary>
      <div className="dropdown-content rounded-box bg-base-100 z-20 mt-1 max-h-96 w-72 overflow-y-auto p-2 shadow-lg">
        {selected.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-xs mb-2 w-full"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        )}
        {tree.map((n) => (
          <Row key={n.node.id} node={n} depth={0} selected={selSet} onToggle={toggle} />
        ))}
        {tree.length === 0 && (
          <p className="text-base-content/60 p-2 text-sm">Loading trades…</p>
        )}
      </div>
    </details>
  );
}
