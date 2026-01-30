import prisma from '@/lib/prisma';

export interface FormSyncData {
  id: string;
  title: string;
  description?: string | null;
  publishedUrl: string;
  editUrl: string;
}

export class FormsDB {
  /**
   * List all sync forms from database
   */
  static async listForms() {
    return prisma.form.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get a single form by ID
   */
  static async getForm(formId: string) {
    return prisma.form.findUnique({
      where: { id: formId }
    });
  }

  /**
   * Upsert (Sync) a form from Google Drive data
   */
  static async syncForm(data: FormSyncData) {
    return prisma.form.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        description: data.description,
        publishedUrl: data.publishedUrl,
        editUrl: data.editUrl,
        updatedAt: new Date()
      },
      create: {
        id: data.id,
        title: data.title,
        description: data.description,
        publishedUrl: data.publishedUrl,
        editUrl: data.editUrl
      }
    });
  }

  /**
   * Update TinyURL data for a form
   */
  static async updateTinyUrl(formId: string, tinyUrl: string, tinyUrlId: string) {
    return prisma.form.update({
      where: { id: formId },
      data: {
        tinyUrl,
        tinyUrlId
      }
    });
  }

  /**
   * Remove TinyURL data from a form
   */
  static async removeTinyUrl(formId: string) {
    return prisma.form.update({
      where: { id: formId },
      data: {
        tinyUrl: null,
        tinyUrlId: null
      }
    });
  }
}
