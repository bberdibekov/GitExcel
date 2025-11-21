// src/taskpane/features/developer/services/test.cases.ts

import { IHybridDiffTest } from "./dev.harness.service";
import { IRawEvent } from "../../../types/types";

/**
 * Defines the structure for a single step in our automated test harness.
 */
export interface ITestStep {
  description: string;
  comment: string;
  action: () => Promise<void>;
  sheetsInvolved?: string[]; // Optional array of sheet names used in this step
}

// --- HYBRID DIFF TEST CONFIGURATION ---
const HYBRID_TEST_SHEET_ID = "HYBRID_TEST_SHEET_01";
const HYBRID_TEST_SHEET_NAME = "HybridTestSheet";

// Helper function to create a raw event with sequential timing
// We accept a baseTime so we can chain events relative to a specific start point
const createMockEvent = (
  changeType: string,
  address: string,
  baseTime: number,
  offsetMs: number
): IRawEvent => {
  const eventTime = baseTime + offsetMs;
  
  // Note: We use 'as any' here because we don't need to define all properties of IRawEvent for the mock
  return {
    changeType: changeType,
    address: address,
    worksheetId: HYBRID_TEST_SHEET_ID,
    worksheetName: HYBRID_TEST_SHEET_NAME,
    timestamp: new Date(eventTime).toISOString(),
  } as any;
};

export const HybridRowInsertRecalcTest: IHybridDiffTest = {
  name: "Row Insert & Recalc Filter Test",
  description:
    "Tests Hybrid Diff's ability to align rows after insertion and filter subsequent system recalculations, leaving only a genuine user edit.",
  sheetId: HYBRID_TEST_SHEET_ID,
  sheetName: HYBRID_TEST_SHEET_NAME,

  // V1 Setup: A1=10, B1=10, A2=FORMULA(A1,B1), A3=20.
  setupAction: async (context: Excel.RequestContext) => {
    const sheet = context.workbook.worksheets.getItem(HYBRID_TEST_SHEET_NAME);
    // A1, B1 are inputs. A2 is the formula result (20).
    sheet.getRange("A1").values = [[10]];
    sheet.getRange("B1").values = [[10]];
    sheet.getRange("A2").formulas = [["=A1+B1"]];
    sheet.getRange("A3").values = [[20]];
    // Fill out rows 4-10 with data so insertion is meaningful
    sheet.getRange("A4:A10").values = [...Array(7).keys()].map(i => [100 + i]);
    await context.sync();
  },

  // Current State Action: Insert row at 5 (shifts A5 down), and edit A1.
  liveAction: async (context: Excel.RequestContext) => {
    const sheet = context.workbook.worksheets.getItem(HYBRID_TEST_SHEET_NAME);

    // 1. Structural Change: Insert Row at 5
    sheet.getRange("5:5").insert(Excel.InsertShiftDirection.down);

    // 2. Intentional User Edit: Change A1. (A2 recalculates as a ripple effect).
    sheet.getRange("A1").values = [[100]];

    await context.sync();
  },

  // Mock Events: Simulating the raw burst captured by the listener.
  // We use a GETTER so that the timestamps are generated at runtime (when the test runs),
  // ensuring they are strictly AFTER 'setupAction' but BEFORE the comparison.
  get mockRawEvents(): IRawEvent[] {
    const startTime = Date.now(); 
    
    return [
      // T+10ms: Structural event (User Intent)
      createMockEvent("RowInserted", "5:5", startTime, 10),

      // T+50ms: User Edit on the intentional change (Crucial for Negative Proof)
      createMockEvent("RangeEdited", "A1", startTime, 50),

      // T+100ms: Echoes of the intentional edit (Sanitizer should drop these)
      createMockEvent("RangeEdited", "A1", startTime, 100),
      createMockEvent("RangeEdited", "A1", startTime, 120),

      // T+400ms: A different noise event on an unrelated cell (Ensures noise is handled)
      createMockEvent("RangeEdited", "C20", startTime, 400),
    ];
  },

  // Expected Output (after Hybrid Diff filters):
  // 1. Modified Cells: 1 (A1 - Intentional Edit)
  // 2. Structural Changes: 1 (Row Insertion at index 5)
  expectedModifiedCellsCount: 1,
  expectedStructuralChangesCount: 1,
};

/**
 * A centralized, static definition of the comprehensive test case.
 */
export const testSteps: ITestStep[] = [
  {
    description: "Setting up v1: Empty Sheet",
    comment: "v1: Initial State",
    sheetsInvolved: [
      "TestSheet",
      HYBRID_TEST_SHEET_NAME,
      "DataSheet",
      "RandomSheet",
      "Scores",
    ], // Ensure cleanup lists all possible test sheets
    action: async () => {
      await Excel.run(async (context) => {
        // Ensure initial sheets exist for subsequent steps
        context.workbook.worksheets.add("TestSheet").getRange().clear();
        context.workbook.worksheets.add(HYBRID_TEST_SHEET_NAME).getRange()
          .clear();
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
        context.workbook.worksheets.getItem("TestSheet").getRange("A2").values =
          [[1]];
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
        context.workbook.worksheets.getItem("TestSheet").getRange("A3").values =
          [[2]];
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
        // Complex formula to test precedent tracking and renormalization
        context.workbook.worksheets.getItem("TestSheet").getRange("A4")
          .formulas = [[
            '=IFERROR(SUM(INDIRECT("A"&2):INDIRECT("A"&3)) + SUM(A2:A3) - SUM(A2:A3) + (A2+A3) + SUMPRODUCT((A2:A3)*1) + SUM(A2:A2,A3:A3) + SUM(A2:A3,0,0) + SUM(OFFSET(A1,1,0,2,1)), "")',
          ]];
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
        const range = context.workbook.worksheets.getItem("TestSheet").getRange(
          "A4",
        );
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
        const range = context.workbook.worksheets.getItem("TestSheet").getRange(
          "A4",
        );
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
        context.workbook.worksheets.getItem("TestSheet").getRange("4:4").insert(
          Excel.InsertShiftDirection.down,
        );
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
        context.workbook.worksheets.getItem("TestSheet").getRange("A4").values =
          [["new value"]];
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
        context.workbook.worksheets.getItem("TestSheet").getRange("A3").values =
          [[25]];
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
        context.workbook.worksheets.getItem("TestSheet").getRange("3:3").delete(
          Excel.DeleteShiftDirection.up,
        );
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
    description: "Setting up v14: Rename 'DataSheet' to 'Scores'",
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
    description:
      "Setting up v15: Add formula reference from main sheet to 'Scores'!B2",
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
        sheet.getRange("A1").values = [["=SUM(B2:C4)"]];
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