// src/taskpane/services/developer/test.cases.ts

/**
 * Defines the structure for a single step in our automated test harness.
 */
export interface ITestStep {
  description: string;
  comment: string;
  action: () => Promise<void>;
}

/**
 * A centralized, static definition of the comprehensive test case.
 * This includes a variety of value, formula, formatting, and structural changes.
 */
export const testSteps: ITestStep[] = [ 
    { description: "Setting up v1: Empty Sheet", comment: "v1: Initial State", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange().clear(); await context.sync(); }); }, }, 
    { description: "Setting up v2: A2 = 1", comment: "v2: A2 = 1", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A2").values = [[1]]; await context.sync(); }); }, }, 
    { description: "Setting up v3: A3 = 2", comment: "v3: A3 = 2", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A3").values = [[2]]; await context.sync(); }); }, }, 
    { description: "Setting up v4: A4 = SUM(A2:A3)", comment: "v4: A4 = SUM", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A4").formulas = [["=SUM(A2:A3)"]]; await context.sync(); }); }, }, 
    { 
      description: "Setting up v5: Format A4 (Bold, Yellow)", 
      comment: "v5: Format SUM cell", 
      action: async () => { 
        await Excel.run(async (context) => { 
          const range = context.workbook.worksheets.getActiveWorksheet().getRange("A4");
          range.format.font.bold = true;
          range.format.fill.color = "yellow";
          await context.sync(); 
        }); 
      }, 
    },
    { 
      description: "Setting up v6: Change A4 format (Not Bold, Orange)", 
      comment: "v6: Change SUM format", 
      action: async () => { 
        await Excel.run(async (context) => { 
          const range = context.workbook.worksheets.getActiveWorksheet().getRange("A4");
          range.format.font.bold = false;
          range.format.fill.color = "orange";
          await context.sync(); 
        }); 
      }, 
    },
    { description: "Setting up v7: Insert row at 4", comment: "v7: Insert row at 4", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("4:4").insert(Excel.InsertShiftDirection.down); await context.sync(); }); }, }, 
    { description: "Setting up v8: A4 = 'new value'", comment: "v8: A4 = 'new value'", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A4").values = [['new value']]; await context.sync(); }); }, }, 
    { description: "Setting up v9: A3 = 25", comment: "v9: A3 = 25", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A3").values = [[25]]; await context.sync(); }); }, }, 
    { description: "Setting up v10: Delete row 3", comment: "v10: Delete row 3", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("3:3").delete(Excel.DeleteShiftDirection.up); await context.sync(); }); }, }, 
];