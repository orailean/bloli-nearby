import { Castle } from "lucide-react";
import type { Content, FilterProps } from "../types.js";
import { TouristFilters } from "../tourism.js";
export { Summary, DetailFields } from "../tourism.js";
export const Icon = Castle;
export function Filters(props: FilterProps) {
  return <TouristFilters {...props} kind="sights" />;
}
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art sights-art" aria-hidden="true">
      <svg className="sights-scene" viewBox="0 0 400 320" fill="none">
        <path d="M37 56h325v216H37z" fill="#e7ebff" />
        <circle cx="297" cy="99" r="26" fill="#efa18a" />
        <path d="M60 254V142h48V98h45v66h41V87h43v167" fill="#b1b9e2" />
        <path
          d="M102 254V123h20v18h22v-18h20v18h22v-18h20v131Z"
          fill="#383b75"
        />
        <path d="M133 254v-44a21 21 0 0 1 42 0v44" fill="#e7ebff" />
        <path d="M235 254V171h102v83z" fill="#df7569" />
        <path d="m226 171 60-43 60 43Z" fill="#383b75" />
        <path
          d="M250 186v48m24-48v48m24-48v48m24-48v48"
          stroke="#f6f8ff"
          strokeWidth="8"
        />
        <path d="M45 254h315" stroke="#383b75" strokeWidth="5" />
        <path
          d="m84 281 20-12h175l38 12"
          stroke="#df7569"
          strokeWidth="3"
          strokeDasharray="5 5"
        />
        <path d="M49 73h61m-61 9h31" stroke="#383b75" strokeWidth="2" />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
