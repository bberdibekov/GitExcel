// src/taskpane/core/services/workbook.metadata.service.ts

import { v4 as uuidv4 } from 'uuid';

const WORKBOOK_ID_KEY = 'VersionControl.WorkbookId';

class WorkbookMetadataService {
  private currentWorkbookId: string | null = null;

  /**
   * Retrieves the persistent, unique ID for the current workbook.
   * If the workbook doesn't have an ID, it generates one, stores it
   * in the workbook's custom properties, and returns it.
   *
   * @param context The current Excel.RequestContext.
   * @returns A promise that resolves to the unique workbook ID.
   */
  public async getWorkbookId(context: Excel.RequestContext): Promise<string> {
    // Return the cached ID if we've already fetched it during this session.
    if (this.currentWorkbookId) {
      return this.currentWorkbookId;
    }

    const customProps = context.workbook.properties.custom;
    const idProp = customProps.getItemOrNullObject(WORKBOOK_ID_KEY);
    idProp.load("value, isNullObject");
    await context.sync();

    if (idProp.isNullObject) {
      // Workbook is new to the add-in. Generate and store an ID.
      const newId = uuidv4();
      customProps.add(WORKBOOK_ID_KEY, newId);
      await context.sync();
      console.log(`[WorkbookMetadataService] New workbook detected. Assigned ID: ${newId}`);
      this.currentWorkbookId = newId;
      return newId;
    } else {
      // Workbook already has an ID.
      this.currentWorkbookId = idProp.value;
      console.log(`[WorkbookMetadataService] Found existing workbook ID: ${this.currentWorkbookId}`);
      return idProp.value;
    }
  }
}

export const workbookMetadataService = new WorkbookMetadataService();