'use client'

import {
  ARTIFACT_LABEL,
  ORIGIN_LABEL,
  STATE_LABEL,
  conceptDetail,
  conceptWhy,
  formatScore,
  type ConceptNode,
} from '@/lib/knowledge'

function ScoreRow({
  label,
  value,
  large,
}: {
  label: string
  value: number | null
  large?: boolean
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="score-row">
      <div className="score-row-head">
        <span>{label}</span>
        <strong className={large ? 'score-large' : undefined}>
          {formatScore(value)}
        </strong>
      </div>
      <div className="score-bar" role="meter" aria-label={label} aria-valuenow={Math.round(pct)}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ConceptOverlay({
  concept,
  onClose,
}: {
  concept: ConceptNode
  onClose: () => void
}) {
  const detail = conceptDetail(concept.id)
  const why = conceptWhy(concept.id)

  return (
    <>
      <div className="overlay-heading">
        <h1>{concept.name}</h1>
        <button type="button" className="overlay-close" onClick={onClose} aria-label="Close concept">
          Close
        </button>
      </div>
      <p>
        <span className={`state-badge state-${concept.state}`}>
          {STATE_LABEL[concept.state]}
        </span>
        {concept.scope !== 'course' ? (
          <span className="state-badge state-personal">Personal concept</span>
        ) : null}
        {concept.cluster ? <span className="cluster-label">{concept.cluster}</span> : null}
      </p>

      <div className="score-block">
        <ScoreRow label="Mastery" value={concept.mastery} large />
        {concept.mastery === null ? <p className="hint">No evidence yet</p> : null}
        <div className="score-grid">
          <ScoreRow label="Familiarity" value={concept.familiarity} />
          <ScoreRow label="Confidence" value={concept.confidence} />
          <ScoreRow label="Readiness" value={concept.readiness} />
          <ScoreRow label="Fragility" value={concept.fragility} />
        </div>
        {concept.fragility > 0.5 ? (
          <p className="hint warn">High fragility: this rests on weak foundations.</p>
        ) : null}
      </div>

      {why ? (
        <section className="overlay-section">
          <h2>Why is my mastery {formatScore(concept.mastery)}?</h2>
          <p>{why.summary}</p>
          {why.strongest_evidence ? (
            <p className="evidence-line">
              <strong>Strongest</strong> {why.strongest_evidence}
            </p>
          ) : null}
          {why.weakest_evidence ? (
            <p className="evidence-line">
              <strong>Weakest</strong> {why.weakest_evidence}
            </p>
          ) : null}
          {why.prerequisite_reason ? (
            <div className="prereq-note">
              <strong>Why is this a prerequisite?</strong>
              <p>{why.prerequisite_reason}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overlay-section">
        <h2>Evidence</h2>
        <ul className="detail-list">
          {detail.evidence.map((item) => (
            <li key={item.id}>
              <div className="detail-row">
                <span>{item.label}</span>
                {item.detail ? <span className="muted">{item.detail}</span> : null}
              </div>
              <div className="detail-meta">
                {item.polarity !== 'neutral' ? (
                  <span className={item.polarity === 'positive' ? 'pos' : 'neg'}>
                    {item.polarity === 'positive' ? 'Positive' : 'Negative'}
                  </span>
                ) : null}
                <span>{item.kind} evidence</span>
                <span>
                  {item.source ? ORIGIN_LABEL[item.source.origin] : 'Source not linked'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="overlay-section">
        <h2>Resources</h2>
        <ul className="detail-list">
          {detail.resources.map((resource) => (
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
      </section>
    </>
  )
}
