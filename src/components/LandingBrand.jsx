import { BrandLockup, SetvalioMark } from './Brand.jsx'

export function LandingMark({ size = 34, className = '' }) {
  return <SetvalioMark size={size} className={className} light />
}

export function LandingBrand({ inverse = false, compact = false, decorative = false }) {
  return <BrandLockup light={inverse} compact={compact} decorative={decorative} className="landing-brand" />
}
