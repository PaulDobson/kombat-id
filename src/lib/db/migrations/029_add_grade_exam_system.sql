-- Migration 029: Grade Exam System
-- Tables: exam_templates, exam_template_items, grade_exams, grade_exam_items

-- exam_templates
CREATE TABLE exam_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_grade          TEXT NOT NULL CHECK (from_grade IN ('white','yellow','green','blue','red','black')),
  to_grade            TEXT NOT NULL CHECK (to_grade IN ('white','yellow','green','blue','red','black')),
  discipline          TEXT NOT NULL DEFAULT 'kombat_taekwondo',
  minimum_pass_score  NUMERIC(5,2) NOT NULL DEFAULT 60.0,  -- porcentaje
  requires_admin_auth BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_grade, to_grade, discipline)
);

-- exam_template_items
CREATE TABLE exam_template_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES exam_templates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  max_score   NUMERIC(6,2) NOT NULL,
  "order"     SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- grade_exams
CREATE TABLE grade_exams (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id             UUID NOT NULL REFERENCES exam_templates(id),
  practitioner_id         UUID NOT NULL REFERENCES practitioners(id),
  instructor_id           UUID NOT NULL REFERENCES practitioners(id),
  from_grade              TEXT NOT NULL,
  to_grade                TEXT NOT NULL,
  discipline              TEXT NOT NULL,
  exam_date               DATE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','pending_authorization','approved','rejected')),
  total_score             NUMERIC(8,2),
  max_possible_score      NUMERIC(8,2),
  score_percentage        NUMERIC(5,2),
  calculated_result       TEXT CHECK (calculated_result IN ('approved','failed')),
  instructor_override     BOOLEAN NOT NULL DEFAULT false,
  override_result         TEXT CHECK (override_result IN ('approved','failed')),
  override_justification  TEXT,
  final_result            TEXT CHECK (final_result IN ('approved','failed')),
  authorized_by           UUID REFERENCES auth.users(id),
  authorized_at           TIMESTAMPTZ,
  rejected_by             UUID REFERENCES auth.users(id),
  rejection_reason        TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- grade_exam_items
CREATE TABLE grade_exam_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID NOT NULL REFERENCES grade_exams(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES exam_template_items(id),
  item_name        TEXT NOT NULL,   -- snapshot
  max_score        NUMERIC(6,2) NOT NULL,
  score            NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON grade_exams(status);
CREATE INDEX ON grade_exams(instructor_id);
CREATE INDEX ON grade_exams(practitioner_id);
