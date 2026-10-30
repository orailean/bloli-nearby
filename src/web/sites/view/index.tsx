import { Mountain } from "lucide-react";
import type { Content, FilterProps } from "../types.js";
import { TouristFilters } from "../tourism.js";
export { Summary, DetailFields } from "../tourism.js";
export const Icon = Mountain;
export function Filters(props: FilterProps) {
  return <TouristFilters {...props} kind="view" />;
}
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art view-art" aria-hidden="true">
      <svg className="view-scene" viewBox="0 0 400 320" fill="none">
        <path d="M29 43h342v232H29z" fill="#d4e9ed" />
        <circle cx="299" cy="94" r="30" fill="#f1c56a" />
        <path d="m29 230 108-147 86 111 58-67 90 108v40H29z" fill="#7fabb4" />
        <path d="m137 83 35 45-20-4-14 16-16-13-22 8z" fill="#f5fafb" />
        <path d="m29 253 120-74 60 68 68-57 94 64v21H29z" fill="#244c5a" />
        <path d="m29 270 76-33 45 38H29Z" fill="#43846f" />
        <path
          d="m262 275-38-51 13-16-27-29"
          stroke="#f1c56a"
          strokeWidth="4"
          strokeDasharray="6 5"
        />
        <path
          d="M29 43v-12h30m282 0h30v12M29 275v13h30m282 0h30v-13"
          stroke="#244c5a"
          strokeWidth="3"
        />
        <path d="M58 70h55m-55 8h28" stroke="#244c5a" strokeWidth="2" />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
