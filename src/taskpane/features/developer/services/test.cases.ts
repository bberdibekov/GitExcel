// src/taskpane/services/developer/test.cases.ts

/**
 * Defines the structure for a single step in our automated test harness.
 */
export interface ITestStep {
  description: string;
  comment: string;
  action: () => Promise<void>;
  sheetsInvolved?: string[]; // Optional array of sheet names used in this step
}

/**
 * A centralized, static definition of the comprehensive test case.
 */
export const testSteps: ITestStep[] = [
  { 
    description: "Setting up v1: Empty Sheet", 
    comment: "v1: Initial State", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.add("TestSheet").getRange().clear(); 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v2: A2 = 1", 
    comment: "v2: A2 = 1", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("A2").values = [[1]]; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v3: A3 = 2", 
    comment: "v3: A3 = 2", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("A3").values = [[2]]; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v4: A4 = SUM(A2:A3)", 
    comment: "v4: A4 = SUM", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("A4").formulas = [["=IFERROR(SUM(INDIRECT(\"A\"&2):INDIRECT(\"A\"&3)) + SUM(A2:A3) - SUM(A2:A3) + (A2+A3) + SUMPRODUCT((A2:A3)*1) + SUM(A2:A2,A3:A3) + SUM(A2:A3,0,0) + SUM(OFFSET(A1,1,0,2,1)), \"\")"]]; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v5: Format A4 (Bold, Yellow)", 
    comment: "v5: Format SUM cell", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        const range = context.workbook.worksheets.getItem("TestSheet").getRange("A4"); 
        range.format.font.bold = true; 
        range.format.fill.color = "yellow"; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v6: Change A4 format (Not Bold, Orange)", 
    comment: "v6: Change SUM format", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        const range = context.workbook.worksheets.getItem("TestSheet").getRange("A4"); 
        range.format.font.bold = false; 
        range.format.fill.color = "orange"; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v7: Insert row at 4", 
    comment: "v7: Insert row at 4", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("4:4").insert(Excel.InsertShiftDirection.down); 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v8: A4 = 'new value'", 
    comment: "v8: A4 = 'new value'", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("A4").values = [['new value']]; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v9: A3 = 25", 
    comment: "v9: A3 = 25", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("A3").values = [[25]]; 
        await context.sync(); 
      }); 
    }, 
  },
  { 
    description: "Setting up v10: Delete row 3", 
    comment: "v10: Delete row 3", 
    sheetsInvolved: ["TestSheet"],
    action: async () => { 
      await Excel.run(async (context) => { 
        context.workbook.worksheets.getItem("TestSheet").getRange("3:3").delete(Excel.DeleteShiftDirection.up); 
        await context.sync(); 
      }); 
    }, 
  },

  {
    description: "Setting up v11: Add new sheet 'DataSheet'",
    comment: "v11: Added new worksheet for data",
    sheetsInvolved: ["DataSheet"],
    action: async () => {
      await Excel.run(async (context) => {
        const newSheet = context.workbook.worksheets.add("DataSheet");
        newSheet.activate();
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v12: Populate DataSheet with values",
    comment: "v12: Insert sample data in DataSheet",
    sheetsInvolved: ["DataSheet"],
    action: async () => {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("DataSheet");
        sheet.getRange("A1:C2").values = [
          ["Name", "Score", "Total"],
          ["Alice", 90, "=SUM(B2:B4)"],
        ];
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v13: Add new sheet 'RandomSheet'",
    comment: "v13: Added new worksheet for data",
    sheetsInvolved: ["RandomSheet"],
    action: async () => {
      await Excel.run(async (context) => {
        const newSheet = context.workbook.worksheets.add("RandomSheet");
        newSheet.activate();
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v14: Rename DataSheet to 'Scores'",
    comment: "v14: Sheet rename test",
    sheetsInvolved: ["DataSheet", "Scores"],
    action: async () => {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("DataSheet");
        sheet.name = "Scores";
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v15: Add formula reference from main sheet to 'Scores'!B2",
    comment: "v15: Cross-sheet formula test",
    sheetsInvolved: ["TestSheet", "Scores"],
    action: async () => {
      await Excel.run(async (context) => {
        const mainSheet = context.workbook.worksheets.getItem("TestSheet");
        mainSheet.getRange("B2").formulas = [["=Scores!B2"]];
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v16: Modify data inside RandomSheet",
    comment: "v16: Update data inside RandomSheet",
    sheetsInvolved: ["RandomSheet"],
    action: async () => {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("RandomSheet");
        sheet.getRange("B3").values = [[31]];
        sheet.getRange("A1").values = [['=SUM(B2:C4)']];
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v17: Modify Scores sheet data",
    comment: "v17: Update data inside Scores sheet",
    sheetsInvolved: ["Scores"],
    action: async () => {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("Scores");
        sheet.getRange("B2").values = [[95]];
        await context.sync();
      });
    },
  },

  {
    description: "Setting up v18: Delete Scores sheet",
    comment: "v18: Sheet deletion test",
    sheetsInvolved: ["Scores"],
    action: async () => {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("Scores");
        sheet.delete();
        await context.sync();
      });
    },
  },
];