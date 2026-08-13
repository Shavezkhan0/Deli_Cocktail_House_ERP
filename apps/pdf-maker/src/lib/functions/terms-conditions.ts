import type { FunctionTemplate } from "./types";

export const termsConditions: FunctionTemplate = {
  id: "terms-conditions",
  name: "Terms & Conditions",
  category: "STANDARD",
  blocks: [
    { id: "tc-size", type: "text", title: "Bar Size & Setup Requirement", description: "To ensure the smooth functioning and overall success of the event, it is imperative that the size and setup of the bars strictly adhere to the specifications and recommendations provided by DCH. These guidelines are based on an assessment of the event's requirements and are designed to optimize service efficiency and guest satisfaction. Failure to comply may result in compromised event quality and shall be addressed as per the terms outlined in this agreement." },
    { id: "tc-alcohol", type: "text", title: "Alcohol Supply Requirements", description: "The client agrees to stock and supply the bar with alcohol as specifically outlined and recommended by DCH. These recommendations are made to ensure a high level of service quality and to meet the preferences and expectations of event attendees. It is the client's responsibility to ensure that an adequate supply of the agreed-upon types and quantities of alcohol is available at the event to avoid any disruption in service." },
    { id: "tc-attendance", type: "text", title: "Attendance & Preparation", description: "For DCH to adequately prepare for the event and ensure sufficient staffing, equipment, and supplies, the client must provide a clear and final guest count no later than three days prior to the event. This information is critical for effective execution and the overall success of the event. Failure to provide accurate and timely details may impact service quality and will be addressed as per the terms outlined in this agreement." },
  ],
};
