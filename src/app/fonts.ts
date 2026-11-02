import { Gloock, Hanken_Grotesk } from "next/font/google";

/** Display: dish names and the big moments. Self-hosted by next/font at build time. */
export const gloock = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock", display: "swap" });

/** UI and numbers: a workhorse grotesk with tabular figures. */
export const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
