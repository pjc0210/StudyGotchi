import type { Metadata } from "next";
import { GrowthStudio } from "./GrowthStudio";
import "./growth.css";

export const metadata: Metadata = {
  title: "Growth stages · StudyGotchi",
  description: "How demo-data courses map onto biomes, districts, and growth stages.",
};

export default function GrowthPage() {
  return <GrowthStudio />;
}
