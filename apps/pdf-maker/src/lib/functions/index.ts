import { mehendi } from "./mehendi";
import { sundownerMehendi } from "./sundowner-mehendi";
import { welcomeLunch } from "./welcome-lunch";
import { guestWelcome } from "./guest-welcome";
import { sangeet } from "./sangeet";
import { lunch } from "./lunch";
import { baraat } from "./baraat";
import { haldi } from "./haldi";
import { cocktail } from "./cocktail";
import { pleaseNote } from "./please-note";
import { termsConditions } from "./terms-conditions";
import type { FunctionTemplate } from "./types";
import { jaimalaPheras } from "./jaimala-pheras";
import { afterParty } from "./after-party";
import { wedding } from "./wedding";
import { receptionAfterParty } from "./reception-after-party";
import { sufiNight } from "./sufi-night";
import { sangeetAfterParty } from "./sangeet-after-party";
import { standardDeliverables } from "./standard-deliverables";
import { mixers } from "./mixers";
import { additionalCharges } from "./additional-charges";

export const LIBRARY: FunctionTemplate[] = [
  mehendi,
  sundownerMehendi,
  welcomeLunch,
  guestWelcome,
  sangeet,
  lunch,
  baraat,
  jaimalaPheras,
  afterParty,
  haldi,
  cocktail,
  pleaseNote,
  termsConditions,
  wedding,
  receptionAfterParty,
  sufiNight,
  sangeetAfterParty,
  standardDeliverables,
  mixers,
  additionalCharges
];

export type { Block, BlockType, FunctionTemplate } from "./types";