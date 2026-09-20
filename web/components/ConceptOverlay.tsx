'use client'

import { analyzeConcept, type ConceptRef } from '@/lib/kg/conceptAnalysis'
import { formatScore, stateStyle } from '@/lib/kg/graph'
import type { GraphModelNode } from '@/lib/kg/graphModel'
import { ORIGIN_LABEL, ARTIFACT_LABEL } from '@/lib/kg/graphTheme'
import type {
  ConceptDetail,
  ConceptEdge,
  ConceptNode,
  Resource,
} from '@/lib/kg/types'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overlay-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StateBadge({ state }: { state: ConceptNode['state'] }) {
  const style = stateStyle(state)
  return (
    <span
      className="state-badge"
      style={{
        color: `var(${style.token})`,
        background: `color-mix(in oklab, var(${style.token}) 14%, transparent)`,
      }}
    >
      {style.label}
    </span>
  )
}

function ScoreRow({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number | null
  hint?: string
  tone?: string
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="score-row">
      <div className="score-row-head">
        <span>{label}</span>
        <strong>{formatScore(value)}</strong>
      </div>
      <div
        className="score-bar"
        role="meter"
        aria-label={label}
        aria-valuenow={value === null ? undefined : Math.round(pct)}
      >
        <span style={{ width: `${pct}%`, background: tone }} />
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

function ConceptRefList({
  concepts,
  onSelect,
  emptyLabel,
}: {
  concepts: ConceptRef[]
  onSelect: (id: string) => void
  emptyLabel: string
}) {
  if (concepts.length === 0) {
    return emptyLabel ? <p className="hint">{emptyLabel}</p> : null
  }
  return (
    <ul className="concept-ref-list">
      {concepts.map((concept) => (
        <li key={concept.id}>
          <button type="button" onClick={() => onSelect(concept.id)}>
            <StateBadge state={concept.state} />
            <span className="concept-ref-name">{concept.name}</span>
            <span className="concept-ref-score">
              {formatScore(concept.understanding)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ResourceRows({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return <p className="hint">No resources linked yet.</p>
  }
  return (
    <ul className="detail-list">
      {resources.map((resource) => (
        <li key={`${resource.id}-${resource.role ?? ''}`}>
          <div className="detail-row">
            <span>{resource.title}</span>
            <span className="muted">{ORIGIN_LABEL[resource.origin]}</span>
          </div>
          <div className="detail-meta">
            <span>{resource.role ?? ARTIFACT_LABEL[resource.artifact_type]}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ConceptOverlay({
  concept,
  detail,
  nodes,
  edges,
  onSelect,
  onClose,
}: {
  concept: ConceptNode
  detail: ConceptDetail
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const analysis = analyzeConcept(concept, nodes, edges)

  return (
    <>
      <div className="overlay-heading">
        <h1>{concept.name}</h1>
        <button
          type="button"
          className="overlay-close"
          onClick={onClose}
          aria-label="Close inspector"
        >
          Close
        </button>
      </div>
      <p className="overlay-tags">
        <StateBadge state={concept.state} />
        {concept.scope !== 'course' ? (
          <span className="state-badge state-personal">Personal concept</span>
        ) : null}
        {concept.cluster ? (
          <span className="cluster-label">{concept.cluster}</span>
        ) : null}
      </p>

      <div className="score-block">
        <ScoreRow label="Understanding" value={concept.understanding} />
        <ScoreRow
          label="Course importance"
          value={concept.importance}
          tone="var(--brand)"
        />
        <ScoreRow
          label="Personal relevance"
          value={concept.personal_relevance}
          hint="How closely this connects to what you've actually worked with."
        />
      </div>

      <Section title="About this concept">
        <p>{detail.definition || analysis.whyItMatters}</p>
      </Section>

      <Section
        title={`Prerequisites${
          analysis.prerequisites.length ? ` (${analysis.prerequisites.length})` : ''
        }`}
      >
        <ConceptRefList
          concepts={analysis.prerequisites}
          onSelect={onSelect}
          emptyLabel="No prerequisites recorded for this concept."
        />
      </Section>

      <Section
        title={`Unlocks${analysis.unlocks.length ? ` (${analysis.unlocks.length})` : ''}`}
      >
        <ConceptRefList
          concepts={analysis.unlocks}
          onSelect={onSelect}
          emptyLabel="This isn't a prerequisite for anything else yet."
        />
      </Section>

      {analysis.related.map((group) => (
        <Section
          key={group.type}
          title={`${group.label} (${group.concepts.length})`}
        >
          <ConceptRefList
            concepts={group.concepts}
            onSelect={onSelect}
            emptyLabel=""
          />
        </Section>
      ))}

      <Section title="Resources">
        <ResourceRows resources={detail.resources} />
      </Section>
    </>
  )
}

export function ResourceOverlay({
  node,
  concepts,
  onSelect,
  onClose,
}: {
  node: Extract<GraphModelNode, { kind: 'resource' }>
  concepts: ConceptNode[]
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const linked = concepts.filter((c) => node.resource.concept_ids.includes(c.id))

  return (
    <>
      <div className="overlay-heading">
        <h1>{node.label}</h1>
        <button
          type="button"
          className="overlay-close"
          onClick={onClose}
          aria-label="Close inspector"
        >
          Close
        </button>
      </div>
      <p className="overlay-tags">
        <span className="state-badge">{ORIGIN_LABEL[node.origin]}</span>
        <span className="cluster-label">{ARTIFACT_LABEL[node.artifactType]}</span>
      </p>

      <Section title={`Concepts covered (${linked.length})`}>
        <ConceptRefList
          concepts={linked.map((c) => ({
            id: c.id,
            name: c.name,
            understanding: c.understanding,
            importance: c.importance,
            state: c.state,
          }))}
          onSelect={onSelect}
          emptyLabel="This file is not linked to any concept yet."
        />
      </Section>
    </>
  )
}
