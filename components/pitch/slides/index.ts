import { SlideQuestion } from "./SlideQuestion";
import { SlideWorldToday } from "./SlideWorldToday";
import { SlideInsight } from "./SlideInsight";
import { SlideReveal } from "./SlideReveal";
import { SlideProduct } from "./SlideProduct";
import { SlideDemo } from "./SlideDemo";
import { SlidePlanHealth } from "./SlidePlanHealth";
import { SlideDifference } from "./SlideDifference";
import { SlideStartingNarrow } from "./SlideStartingNarrow";
import { SlideBiggerOpportunity } from "./SlideBiggerOpportunity";
import { SlideTechnicalThesis } from "./SlideTechnicalThesis";
import { SlideAIEconomics } from "./SlideAIEconomics";
import { SlideBusinessModel } from "./SlideBusinessModel";
import { SlideWhyNow } from "./SlideWhyNow";
import { SlideRoadmap } from "./SlideRoadmap";
import { SlideCTOCase } from "./SlideCTOCase";
import { SlideBiggerVision } from "./SlideBiggerVision";
import { SlideProve } from "./SlideProve";
import { SlideAsk } from "./SlideAsk";
import { SlideClosing } from "./SlideClosing";

export type SlideDef = {
  id: string;
  title: string;
  steps?: number;
  Component: React.ComponentType;
};

export const SLIDES: SlideDef[] = [
  { id: "question", title: "The question", steps: 4, Component: SlideQuestion },
  { id: "world", title: "The world today", steps: 4, Component: SlideWorldToday },
  { id: "insight", title: "The insight", steps: 3, Component: SlideInsight },
  { id: "reveal", title: "The reveal", steps: 3, Component: SlideReveal },
  { id: "product", title: "The product", steps: 1, Component: SlideProduct },
  { id: "demo", title: "The demo", steps: 6, Component: SlideDemo },
  { id: "plan-health", title: "Plan Health", steps: 2, Component: SlidePlanHealth },
  { id: "difference", title: "The difference", steps: 3, Component: SlideDifference },
  { id: "starting-narrow", title: "Starting narrow", steps: 1, Component: SlideStartingNarrow },
  { id: "bigger-opportunity", title: "The bigger opportunity", steps: 1, Component: SlideBiggerOpportunity },
  { id: "tech-thesis", title: "Technical thesis", steps: 2, Component: SlideTechnicalThesis },
  { id: "ai-economics", title: "AI economics", steps: 1, Component: SlideAIEconomics },
  { id: "business", title: "Business model", steps: 1, Component: SlideBusinessModel },
  { id: "why-now", title: "Why now", steps: 1, Component: SlideWhyNow },
  { id: "roadmap", title: "Roadmap", steps: 1, Component: SlideRoadmap },
  { id: "cto-case", title: "For a CTO", steps: 2, Component: SlideCTOCase },
  { id: "bigger-vision", title: "The bigger vision", steps: 3, Component: SlideBiggerVision },
  { id: "prove", title: "What we prove", steps: 1, Component: SlideProve },
  { id: "ask", title: "The ask", steps: 1, Component: SlideAsk },
  { id: "closing", title: "Closing", steps: 4, Component: SlideClosing },
];
