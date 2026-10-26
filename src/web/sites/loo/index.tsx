import { ArrowDown, Toilet, Smile, Coins, Accessibility } from "lucide-react";
import { formatCharge } from "../../i18n.js";
import type { FilterProps, Content, ItemProps } from "../types.js";
import type { Locale } from "../../../shared/types.js";
export const Icon = Toilet;
export function Artwork({t}: {t: Content}) {
  return <div className="hero-art" aria-hidden="true">
    <div className="route-doodle"><span/><span/><span/></div>
    <div className="roll-character"><div className="roll-end"><i/></div>
      <div className="roll-front"><div className="roll-eyes"><i/><i/></div><div className="roll-smile"/></div>
      <div className="paper-tail"><div className="tear-line"/><Toilet size={32}/></div>
    </div><span className="art-caption">{t.sticker}<ArrowDown size={20}/></span>
    <span className="little-spark spark-one">✳</span><span className="little-spark spark-two">✳</span>
  </div>;
}
export function Filters({t, fee, onFee}: FilterProps) {
 return <div className="fee-filters" role="group" aria-label={t.fee}>{(["all","free","paid"] as const).map(f => <button key={f} aria-pressed={fee===f} className={fee===f ? "active" : ""} onClick={()=>onFee(f)}>{f==='all'?<Toilet size={16}/>:f==='free'?<Smile size={16}/>:<Coins size={16}/>}<span>{t[f]}</span></button>)}</div>;
}
export function Summary({item,t}: ItemProps) {
 return <><span className={`fee-badge ${item.fee}`}>{t[item.fee==='unknown'?'feeUnknown':item.fee==='free'?'freeBadge':'paidBadge']}</span>{item.wheelchair==='yes'&&<Accessibility size={14} aria-label={t.wheelchair}/>}</>;
}
export function DetailFields({item,t,locale}: ItemProps & {locale: Locale}) {
 return <><div><dt><Coins size={16}/>{t.fee}</dt><dd>{(item.charge ? formatCharge(item.charge,locale):null)||t[item.fee==='unknown'?'unknown':item.fee==='free'?'freeBadge':'paidBadge']}</dd></div>{item.feeText&&<div><dt>{t.priceInfo}</dt><dd>{item.feeText}</dd></div>}</>;
}
