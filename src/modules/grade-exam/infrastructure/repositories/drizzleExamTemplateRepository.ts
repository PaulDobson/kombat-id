import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  ExamTemplate,
  ExamTemplateItem,
  Grade,
  Discipline,
} from "../../domain/entities/examTemplate";
import type { IExamTemplateRepository } from "../../domain/interfaces/examTemplateRepository";

type ExamTemplateRow = Database["public"]["Tables"]["exam_templates"]["Row"];
type ExamTemplateInsert =
  Database["public"]["Tables"]["exam_templates"]["Insert"];
type ExamTemplateItemRow =
  Database["public"]["Tables"]["exam_template_items"]["Row"];
type ExamTemplateItemInsert =
  Database["public"]["Tables"]["exam_template_items"]["Insert"];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ExamTemplateRowSchema = z.object({
  id: z.string().uuid(),
  from_grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  to_grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  discipline: z.string().min(1),
  minimum_pass_score: z.number(),
  requires_admin_auth: z.boolean(),
  is_active: z.boolean(),
  created_by: z.string().uuid(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const ExamTemplateItemRowSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  max_score: z.number(),
  order: z.number().int(),
  created_at: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleExamTemplateRepository implements IExamTemplateRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<ExamTemplate | null> {
    const { data: templateData, error: templateError } = await adminSupabase
      .from("exam_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (templateError)
      throw new DomainError(
        `Failed to find exam template by id: ${templateError.message}`,
      );
    if (!templateData) return null;

    const items = await this.fetchItems(id);
    return this.fromRow(templateData as ExamTemplateRow, items);
  }

  async findByGradeTransition(
    fromGrade: Grade,
    toGrade: Grade,
  ): Promise<ExamTemplate | null> {
    const { data: templateData, error } = await adminSupabase
      .from("exam_templates")
      .select("*")
      .eq("from_grade", fromGrade)
      .eq("to_grade", toGrade)
      .eq("is_active", true)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find exam template by grade transition: ${error.message}`,
      );
    if (!templateData) return null;

    const items = await this.fetchItems(templateData.id);
    return this.fromRow(templateData as ExamTemplateRow, items);
  }

  async findAll(): Promise<ExamTemplate[]> {
    const { data: templates, error } = await adminSupabase
      .from("exam_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error)
      throw new DomainError(`Failed to list exam templates: ${error.message}`);

    if (!templates || templates.length === 0) return [];

    const templateIds = templates.map((t) => t.id);
    const { data: allItems, error: itemsError } = await adminSupabase
      .from("exam_template_items")
      .select("*")
      .in("template_id", templateIds)
      .order("order", { ascending: true });

    if (itemsError)
      throw new DomainError(
        `Failed to load exam template items: ${itemsError.message}`,
      );

    const itemsByTemplateId = new Map<string, ExamTemplateItemRow[]>();
    for (const item of (allItems as ExamTemplateItemRow[]) ?? []) {
      const list = itemsByTemplateId.get(item.template_id) ?? [];
      list.push(item);
      itemsByTemplateId.set(item.template_id, list);
    }

    return (templates as ExamTemplateRow[]).map((row) =>
      this.fromRow(row, itemsByTemplateId.get(row.id) ?? []),
    );
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(template: ExamTemplate): Promise<void> {
    const templateRow = this.toRow(template);
    const itemRows = template.items.map((item) => this.toItemRow(item));

    // Insert template
    const { error: templateError } = await adminSupabase
      .from("exam_templates")
      .insert(templateRow as ExamTemplateInsert);

    if (templateError)
      throw new DomainError(
        `Failed to save exam template: ${templateError.message}`,
      );

    // Insert items (if any)
    if (itemRows.length > 0) {
      const { error: itemsError } = await adminSupabase
        .from("exam_template_items")
        .insert(itemRows as ExamTemplateItemInsert[]);

      if (itemsError) {
        // Attempt rollback: delete the template we just inserted
        await adminSupabase
          .from("exam_templates")
          .delete()
          .eq("id", template.id);
        throw new DomainError(
          `Failed to save exam template items: ${itemsError.message}`,
        );
      }
    }
  }

  async update(template: ExamTemplate): Promise<void> {
    const { error } = await adminSupabase
      .from("exam_templates")
      .update({
        from_grade: template.fromGrade,
        to_grade: template.toGrade,
        discipline: template.discipline,
        minimum_pass_score: template.minimumPassScore,
        requires_admin_auth: template.requiresAdminAuth,
        is_active: template.isActive,
        updated_at: template.updatedAt,
      } as unknown as never)
      .eq("id", template.id);

    if (error)
      throw new DomainError(`Failed to update exam template: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async fetchItems(templateId: string): Promise<ExamTemplateItemRow[]> {
    const { data, error } = await adminSupabase
      .from("exam_template_items")
      .select("*")
      .eq("template_id", templateId)
      .order("order", { ascending: true });

    if (error)
      throw new DomainError(
        `Failed to load exam template items: ${error.message}`,
      );

    return (data as ExamTemplateItemRow[]) ?? [];
  }

  private fromRow(
    row: ExamTemplateRow,
    itemRows: ExamTemplateItemRow[],
  ): ExamTemplate {
    const parsed = ExamTemplateRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new DomainError(
        `ExamTemplate row failed schema validation: ${parsed.error.message}`,
      );
    }

    const items: ExamTemplateItem[] = itemRows.map((itemRow) => {
      const parsedItem = ExamTemplateItemRowSchema.safeParse(itemRow);
      if (!parsedItem.success) {
        throw new DomainError(
          `ExamTemplateItem row failed schema validation: ${parsedItem.error.message}`,
        );
      }
      return {
        id: parsedItem.data.id,
        templateId: parsedItem.data.template_id,
        name: parsedItem.data.name,
        description: parsedItem.data.description,
        maxScore: parsedItem.data.max_score,
        order: parsedItem.data.order,
      };
    });

    return {
      id: parsed.data.id,
      fromGrade: parsed.data.from_grade as Grade,
      toGrade: parsed.data.to_grade as Grade,
      discipline: parsed.data.discipline as Discipline,
      minimumPassScore: parsed.data.minimum_pass_score,
      requiresAdminAuth: parsed.data.requires_admin_auth,
      isActive: parsed.data.is_active,
      items,
      createdBy: parsed.data.created_by,
      createdAt: parsed.data.created_at,
      updatedAt: parsed.data.updated_at,
    };
  }

  private toRow(template: ExamTemplate): ExamTemplateInsert {
    return {
      id: template.id,
      from_grade: template.fromGrade,
      to_grade: template.toGrade,
      discipline: template.discipline,
      minimum_pass_score: template.minimumPassScore,
      requires_admin_auth: template.requiresAdminAuth,
      is_active: template.isActive,
      created_by: template.createdBy,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    };
  }

  private toItemRow(item: ExamTemplateItem): ExamTemplateItemInsert {
    return {
      id: item.id,
      template_id: item.templateId,
      name: item.name,
      description: item.description,
      max_score: item.maxScore,
      order: item.order,
    };
  }
}
