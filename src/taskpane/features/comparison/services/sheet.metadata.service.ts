import { v4 as uuidv4 } from 'uuid';

// This is now the key for the custom property stored ON the worksheet itself.
const SHEET_ID_CUSTOM_PROPERTY_KEY = 'VersionControl.PersistentSheetId';

/**
 * A type for the mapping of persistent sheet ID to its last known name.
 * e.g., { "abc-123-def-456": "Sales Data" }
 */
export type SheetIdToNameMap = {
  [persistentId: string]: string;
};

class SheetMetadataService {
  /**
   * The core function for managing sheet identity. It reads persistent IDs directly
   * from each worksheet's custom properties. If a sheet doesn't have an ID, it's
   * considered new, and an ID is generated and stored on the sheet.
   * @param context The current Excel RequestContext.
   * @returns An up-to-date map of persistent sheet IDs to their current names.
   */
  public async reconcileAndGetSheetMap(context: Excel.RequestContext): Promise<SheetIdToNameMap> {
    const sheetIdToNameMap: SheetIdToNameMap = {};
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    for (const sheet of sheets.items) {
      const customProps = sheet.customProperties;
      const idProp = customProps.getItemOrNullObject(SHEET_ID_CUSTOM_PROPERTY_KEY);
      idProp.load("value, isNullObject");
      await context.sync();
      
      let persistentId: string;

      if (idProp.isNullObject) {
        // This is a new sheet without an ID. Assign one and persist it.
        persistentId = uuidv4();
        customProps.add(SHEET_ID_CUSTOM_PROPERTY_KEY, persistentId);
        console.log(`[MetadataService] New sheet detected: "${sheet.name}". Assigned and stored ID: ${persistentId}`);
      } else {
        persistentId = idProp.value;
      }
      
      sheetIdToNameMap[persistentId] = sheet.name;
    }

    await context.sync();
    console.log("[MetadataService] Sheet map reconciled from custom properties.", sheetIdToNameMap);
    return sheetIdToNameMap;
  }
}

export const sheetMetadataService = new SheetMetadataService();