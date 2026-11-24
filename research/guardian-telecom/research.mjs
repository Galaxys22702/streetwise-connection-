import assert from "node:assert/strict";
const checked="2026-11-23";
const sources=Object.freeze([
 ["ATT","transparency","https://sustainability.att.com/reports/transparency-report","Published aggregate legal-demand statistics"],
 ["TMOBILE","transparency","https://www.t-mobile.com/news/transparency-reports","Annual report archive"],
 ["VERIZON","transparency","https://www.verizon.com/about/investors/feed/transparency-report-archives","Semiannual report archive"],
 ["US COURTS","transparency","https://www.uscourts.gov/data-news/reports/statistical-reports/wiretap-reports/wiretap-report-2025","National annual court-authorized intercept counts; excludes FISA"],
 ["ODNI","transparency","https://www.odni.gov/12834/astr-cy25/","Annual national-security transparency statistics"],
 ["FCC","market","https://help.bdc.fcc.gov/hc/en-us/articles/13532984820379-What-s-on-the-National-Broadband-Map","Provider-reported coverage, not guaranteed performance"],
 ["GSMA","integration","https://www.gsma.com/solutions-and-impact/gsma-open-gateway/gsma-open-gateway-api-descriptions/","Public API standards, not production entitlements"],
 ["FBI NDCAC","compliance","https://ndcac.fbi.gov/calea","Public CALEA legal overview; applicability requires counsel"],
 ["ATT","business","https://www.business.att.com/","Public business offerings"],
 ["TMOBILE","business","https://www.t-mobile.com/business","Public business offerings"],
 ["VERIZON","business","https://www.verizon.com/business/","Public business offerings"]
].map(([publisher,category,url,scope])=>Object.freeze({publisher,category,url,scope,checked})));
const observations=Object.freeze([
 Object.freeze({source:"US COURTS",period:"2025",metric:"national court-authorized wiretaps reported",value:1735,unit:"orders",notComparableTo:"daily carrier usage or national-security surveillance",url:sources[3].url})
]);
function report(){
 return {researchAsOf:checked,mode:"offline public-source research",sources,observations,
  agencyDailyCarrierActivity:"unknown; not collected",subscriberData:"not collected",
  carrierProductionAccess:"not authorized or verified",liveInference:"not verified",
  privacyCompliance:{status:"legal review required",automaticDisclosure:false,interception:false,agencyAccess:false,
  next:"Determine applicable obligations with counsel and contracted provider; use only synthetic data for tests. Preserve least privilege and independent approval."},
  opportunities:["authorized cross-carrier service assurance","consenting business pilot","aggregate coverage and cost comparison","privacy and compliance reporting"],
  next:"Review official sources periodically; validate dates, metric definitions and licensing before ingesting new aggregates."};
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test"){
 const r=report();
 assert.equal(r.sources.length,11);
 assert.equal(new Set(r.sources.map(s=>s.url)).size,11);
 assert.ok(r.sources.every(s=>new URL(s.url).protocol==="https:"));
 assert.equal(r.observations[0].value,1735);
 assert.equal(r.agencyDailyCarrierActivity,"unknown; not collected");
 assert.equal(r.privacyCompliance.automaticDisclosure,false);
 assert.equal(r.privacyCompliance.interception,false);
 assert.equal(r.privacyCompliance.agencyAccess,false);
 assert.equal(r.carrierProductionAccess,"not authorized or verified");
 console.log("9 assertions passed; offline public-source catalog only.");
}else if(args.length===0){console.log(JSON.stringify(report(),null,2));}
else{console.error("Usage: node research.mjs [--self-test]");process.exitCode=2;}
