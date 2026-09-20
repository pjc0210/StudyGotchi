"use client";

import type { CourseSummary } from "@/lib/identity";
import type { CourseOverviewCacheState } from "./useCourseOverviewCache";

export interface CourseNavigatorProps {
  courses: readonly CourseSummary[];
  activeCourseId: string | null;
  records: CourseOverviewCacheState;
  expandedCourseIds: ReadonlySet<string>;
  expandedTopicIds: ReadonlySet<string>;
  onToggleCourse(courseId: string): void;
  onToggleTopic(nodeId: string): void;
  onFocusCourse(courseId: string): void;
  onLand(): void;
  onRetry(courseId: string): void;
}

function Chevron({ expanded }: { expanded: boolean }) {
  return <span aria-hidden>{expanded ? "⌄" : "›"}</span>;
}

export function CourseNavigator({
  courses,
  activeCourseId,
  records,
  expandedCourseIds,
  expandedTopicIds,
  onToggleCourse,
  onToggleTopic,
  onFocusCourse,
  onLand,
  onRetry,
}: CourseNavigatorProps) {
  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;
  const activeRecord = activeCourseId ? records.get(activeCourseId) : undefined;
  const activeOverview = activeRecord?.status === "ready" ? activeRecord.data : null;

  return (
    <aside className="course-navigator" aria-label="Course navigator">
      <header className="course-navigator-summary">
        <span className="sg-eyebrow">Course navigator</span>
        {activeCourse ? (
          <>
            <h1>{activeCourse.code ?? activeCourse.name}</h1>
            <p>{activeCourse.name}</p>
            {activeOverview ? (
              <div className="course-navigator-stats" aria-label="Active course statistics">
                <span>{activeOverview.stats.reached}/{activeOverview.stats.total} reached</span>
                <span>{activeOverview.stats.mastered} mastered</span>
                <span>{activeOverview.stats.residents} residents</span>
                <span>{activeOverview.stats.sources} sources</span>
              </div>
            ) : (
              <p className="course-navigator-status">
                {activeRecord?.status === "error" ? activeRecord.error : "Loading course summary…"}
              </p>
            )}
            <button type="button" className="sg-btn sg-btn-primary" onClick={onLand}>
              Land
            </button>
          </>
        ) : (
          <p className="course-navigator-status">No courses yet.</p>
        )}
      </header>

      {courses.length > 0 ? (
        <div className="course-navigator-tree">
          <ul className="course-tree">
            {courses.map((course) => {
              const expanded = expandedCourseIds.has(course.id);
              const active = course.id === activeCourseId;
              const record = records.get(course.id);
              const branchId = `course-branch-${course.id}`;
              return (
                <li key={course.id}>
                  <div className="course-tree-row" data-active={active || undefined}>
                    <button
                      type="button"
                      className="course-tree-disclosure"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${course.name}`}
                      aria-expanded={expanded}
                      aria-controls={branchId}
                      onClick={() => onToggleCourse(course.id)}
                    >
                      <Chevron expanded={expanded} />
                    </button>
                    <button
                      type="button"
                      className="course-tree-title"
                      aria-current={active ? "true" : undefined}
                      onClick={() => onFocusCourse(course.id)}
                    >
                      <span>{course.code ?? "Course"}</span>
                      <small>{course.name}</small>
                    </button>
                  </div>

                  {expanded ? (
                    <div id={branchId} className="course-tree-branch">
                      {!record || record.status === "idle" || record.status === "loading" ? (
                        <p className="course-tree-message">Loading topics…</p>
                      ) : record.status === "error" ? (
                        <div className="course-tree-message">
                          <span>{record.error}</span>
                          <button type="button" onClick={() => onRetry(course.id)}>Retry</button>
                        </div>
                      ) : (
                        <ul>
                          {record.data.topics.map((topic) => {
                            const topicKey = `${course.id}:topic:${topic.id}`;
                            const topicExpanded = expandedTopicIds.has(topicKey);
                            return (
                              <li key={topic.id}>
                                <div className="course-tree-row is-topic">
                                  <button
                                    type="button"
                                    className="course-tree-disclosure"
                                    aria-label={`${topicExpanded ? "Collapse" : "Expand"} ${topic.label}`}
                                    aria-expanded={topicExpanded}
                                    onClick={() => onToggleTopic(topicKey)}
                                  >
                                    <Chevron expanded={topicExpanded} />
                                  </button>
                                  <span className="course-tree-label">{topic.label}</span>
                                </div>
                                {topicExpanded ? (
                                  <ul>
                                    {topic.concepts.map((concept) => {
                                      const conceptKey = `${course.id}:concept:${concept.id}`;
                                      const conceptExpanded = expandedTopicIds.has(conceptKey);
                                      const hasFiles = concept.files.length > 0;
                                      return (
                                        <li key={concept.id}>
                                          <div className="course-tree-row is-concept">
                                            {hasFiles ? (
                                              <button
                                                type="button"
                                                className="course-tree-disclosure"
                                                aria-label={`${conceptExpanded ? "Collapse" : "Expand"} files for ${concept.label}`}
                                                aria-expanded={conceptExpanded}
                                                onClick={() => onToggleTopic(conceptKey)}
                                              >
                                                <Chevron expanded={conceptExpanded} />
                                              </button>
                                            ) : (
                                              <span className="course-tree-spacer" aria-hidden />
                                            )}
                                            <span className="course-tree-label">{concept.label}</span>
                                          </div>
                                          {conceptExpanded ? (
                                            <ul className="course-tree-files">
                                              {concept.files.map((file) => (
                                                <li key={file.id}>{file.title}</li>
                                              ))}
                                            </ul>
                                          ) : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : null}
                              </li>
                            );
                          })}

                          {record.data.unmatchedFiles.length > 0 ? (
                            <li>
                              {(() => {
                                const otherKey = `${course.id}:other-files`;
                                const otherExpanded = expandedTopicIds.has(otherKey);
                                return (
                                  <>
                                    <div className="course-tree-row is-topic">
                                      <button
                                        type="button"
                                        className="course-tree-disclosure"
                                        aria-label={`${otherExpanded ? "Collapse" : "Expand"} Other files`}
                                        aria-expanded={otherExpanded}
                                        onClick={() => onToggleTopic(otherKey)}
                                      >
                                        <Chevron expanded={otherExpanded} />
                                      </button>
                                      <span className="course-tree-label">Other files</span>
                                    </div>
                                    {otherExpanded ? (
                                      <ul className="course-tree-files">
                                        {record.data.unmatchedFiles.map((file) => (
                                          <li key={file.id}>{file.title}</li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
