import { useState } from 'react'
import { useStore, kindLabel } from '../store'
import type { MaterialKind } from '../types'

const kinds: MaterialKind[] = ['slides', 'reading', 'homework', 'instructor', 'notes', 'practice']

export function UploadPage() {
  const { files, classrooms, addFile, toggleFileClassroom, setFileTopics, pushToast } = useStore()
  const [hot, setHot] = useState(false)
  const [kind, setKind] = useState<MaterialKind>('slides')
  const [classroomId, setClassroomId] = useState<string>(classrooms[0]?.id ?? '')
  const [apply, setApply] = useState(true)
  const [topics, setTopics] = useState('linear systems')

  const ingest = (name: string, sizeLabel: string) => {
    addFile({
      id: crypto.randomUUID(),
      name,
      kind,
      sizeLabel,
      topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
      classroomId: classroomId || null,
      appliedToClassroom: apply && Boolean(classroomId),
    })
  }

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Upload materials
      </h2>
      <p className="muted">
        Lecture slides, readings, homework, instructor packets, handwritten notes, practice problems — files or a zip of a directory.
      </p>
      <div className="split">
        <div
          className={`drop ${hot ? 'hot' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setHot(true)
          }}
          onDragLeave={() => setHot(false)}
          onDrop={(e) => {
            e.preventDefault()
            setHot(false)
            const list = [...e.dataTransfer.files]
            if (!list.length) return
            list.forEach((file) => ingest(file.name, `${Math.max(1, Math.round(file.size / 1024))} KB`))
          }}
        >
          <p className="serif" style={{ fontSize: 24, margin: '0 0 8px' }}>
            Drop files or a .zip
          </p>
          <p className="muted">Nothing leaves this browser. Mock ingest only.</p>
          <label className="btn" style={{ display: 'inline-block', marginTop: 8 }}>
            Browse
            <input
              type="file"
              multiple
              hidden
              accept=".pdf,.zip,.png,.jpg,.jpeg,.txt,.md"
              onChange={(e) => {
                const list = [...(e.target.files ?? [])]
                list.forEach((file) => ingest(file.name, `${Math.max(1, Math.round(file.size / 1024))} KB`))
                e.target.value = ''
              }}
            />
          </label>
          <button
            className="btn ghost"
            style={{ marginLeft: 8 }}
            type="button"
            onClick={() => {
              ingest('18.06.zip', '13 MB')
              pushToast('Loaded sample course zip from mock shelf.')
            }}
          >
            Use sample 18.06.zip
          </button>
        </div>
        <div className="card">
          <h3>How this ingest should land</h3>
          <label className="field">
            <span>Material kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Topic labels (comma)</span>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} />
          </label>
          <label className="field">
            <span>Classroom</span>
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">Keep private</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
            Apply this file to the classroom map
          </label>
        </div>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Library</h3>
        {files.map((f) => (
          <div className="file-row" key={f.id}>
            <div>
              <strong>{f.name}</strong>
              <div className="muted">
                {kindLabel(f.kind)} · {f.sizeLabel} · {f.topics.join(', ') || 'no topics'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {f.classroomId && (
                <button className="btn ghost small" onClick={() => toggleFileClassroom(f.id)}>
                  {f.appliedToClassroom ? 'Unshare from classroom' : 'Apply to classroom'}
                </button>
              )}
              <button
                className="btn ghost small"
                onClick={() => {
                  const next = window.prompt('Topics, comma separated', f.topics.join(', '))
                  if (next != null) setFileTopics(f.id, next.split(',').map((t) => t.trim()).filter(Boolean))
                }}
              >
                Label topics
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
