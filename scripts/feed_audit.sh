#!/usr/bin/env bash
set -uo pipefail

TMP_DIR="${TMP_DIR:-/tmp/godseye-feed-audit}"
mkdir -p "$TMP_DIR"

fetch_json() {
  local url="$1"
  local out="$2"
  if curl -s --retry 3 --retry-delay 1 --max-time 45 "$url" -o "$out"; then
    return 0
  fi
  echo "{}" > "$out"
  return 1
}

safe_jq_number() {
  local file="$1"
  local expr="$2"
  local fallback="${3:-0}"
  jq -r "($expr) // $fallback" "$file" 2>/dev/null || echo "$fallback"
}

echo "== Flight Coverage =="

fetch_json "https://api.adsb.one/v2/point/0/0/10000" "$TMP_DIR/adsb_one.json" || echo "WARN adsb.one global fetch failed"
fetch_json "https://api.airplanes.live/v2/point/0/0/10000" "$TMP_DIR/airplanes_live.json" || echo "WARN airplanes.live global fetch failed"
fetch_json "https://api.adsb.lol/v2/point/0/0/10000" "$TMP_DIR/adsb_lol.json" || echo "WARN adsb.lol global fetch failed"
fetch_json "https://opensky-network.org/api/states/all" "$TMP_DIR/opensky_global.json" || echo "WARN opensky global fetch failed"
fetch_json "https://opensky-network.org/api/states/all?lamin=6&lomin=68&lamax=36&lomax=98" "$TMP_DIR/opensky_india.json" || echo "WARN opensky india bbox fetch failed"

echo "ADSB_ONE_GLOBAL $(safe_jq_number "$TMP_DIR/adsb_one.json" '(.ac // []) | length')"
echo "AIRPLANES_LIVE_GLOBAL $(safe_jq_number "$TMP_DIR/airplanes_live.json" '(.ac // []) | length')"
echo "ADSB_LOL_GLOBAL $(safe_jq_number "$TMP_DIR/adsb_lol.json" '(.ac // []) | length')"
echo "OPENSKY_GLOBAL $(safe_jq_number "$TMP_DIR/opensky_global.json" '(.states // []) | length')"
echo "OPENSKY_INDIA_BBOX $(safe_jq_number "$TMP_DIR/opensky_india.json" '(.states // []) | length')"

jq -s '
  map((.ac // [])[]) | unique_by(.hex) as $u |
  def inbbox($minLat;$maxLat;$minLon;$maxLon): (.lat>= $minLat and .lat<= $maxLat and .lon>= $minLon and .lon<= $maxLon);
  [
    "UNION_GLOBAL \($u|length)",
    "UNION_INDIA \($u|map(select(inbbox(6;36;68;98)))|length)",
    "UNION_AFRICA \($u|map(select(inbbox(-35;38;-20;55)))|length)",
    "UNION_E_ASIA \($u|map(select(inbbox(18;55;100;150)))|length)",
    "UNION_S_AMERICA \($u|map(select(inbbox(-60;15;-90;-30)))|length)",
    "UNION_OCEANIA \($u|map(select(inbbox(-50;0;110;180)))|length)"
  ] | .[]
' -r "$TMP_DIR/adsb_one.json" "$TMP_DIR/airplanes_live.json" "$TMP_DIR/adsb_lol.json" 2>/dev/null || true

echo
echo "== Other Feed Coverage =="

if celestrak=$(curl -s --max-time 45 "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle" \
  | awk 'NF{c++} END{printf "%d", int(c/3)}'); then
  echo "CELESTRAK_ACTIVE_RECORDS ${celestrak:-0}"
else
  echo "CELESTRAK_ACTIVE_RECORDS ERR"
fi

if celestrak_debris=$(curl -s --max-time 45 "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=json" \
  | jq -r 'if type=="array" then length else 0 end' 2>/dev/null); then
  echo "CELESTRAK_COSMOS2251_DEBRIS ${celestrak_debris:-0}"
else
  echo "CELESTRAK_COSMOS2251_DEBRIS ERR"
fi

if celestrak_fengyun=$(curl -s --max-time 45 "https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=json" \
  | jq -r 'if type=="array" then length else 0 end' 2>/dev/null); then
  echo "CELESTRAK_FENGYUN1C_DEBRIS ${celestrak_fengyun:-0}"
else
  echo "CELESTRAK_FENGYUN1C_DEBRIS ERR"
fi

if usgs=$(curl -s --max-time 45 "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson" \
  | jq -r '.features|length' 2>/dev/null); then
  echo "USGS_ALL_HOUR ${usgs:-0}"
else
  echo "USGS_ALL_HOUR ERR"
fi

if nws=$(curl -s --max-time 45 "https://api.weather.gov/alerts/active?status=actual" \
  | jq -r '.features|length' 2>/dev/null); then
  echo "NWS_ALERTS_ACTIVE ${nws:-0}"
else
  echo "NWS_ALERTS_ACTIVE ERR"
fi

if gdacs=$(curl -s --max-time 45 "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" \
  | jq -r '.features|length' 2>/dev/null); then
  echo "GDACS_EVENTS ${gdacs:-0}"
else
  echo "GDACS_EVENTS ERR"
fi

if fetch_json "https://gis.wfp.org/arcgis/rest/services/GLOBAL/GlobalPorts/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json" "$TMP_DIR/global_ports_count.json"; then
  ports="$(safe_jq_number "$TMP_DIR/global_ports_count.json" '.count' 0)"
  if [ "${ports:-0}" = "0" ]; then
    fetch_json "https://gis.wfp.org/arcgis/rest/services/GLOBAL/GlobalPorts/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=pjson" "$TMP_DIR/global_ports_count.json" >/dev/null 2>&1 || true
    ports="$(safe_jq_number "$TMP_DIR/global_ports_count.json" '.count' 0)"
  fi
  echo "GLOBAL_PORTS_COUNT ${ports:-0}"
else
  echo "GLOBAL_PORTS_COUNT ERR"
fi

if odin=$(curl -s --max-time 45 "https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records?limit=1" \
  | jq -r '.total_count // 0' 2>/dev/null); then
  echo "ODIN_OUTAGE_RECORDS ${odin:-0}"
else
  echo "ODIN_OUTAGE_RECORDS ERR"
fi

if conflicts=$(curl -s --max-time 45 "https://query.wikidata.org/sparql?format=json&query=PREFIX%20xsd%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%20SELECT%20(COUNT(%3Fitem)%20AS%20%3Fcount)%20WHERE%20%7B%20%3Fitem%20wdt%3AP31%2Fwdt%3AP279*%20wd%3AQ350604.%20%3Fitem%20wdt%3AP625%20%3Fcoord.%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP580%20%3Fstart.%20%7D%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP571%20%3Finception.%20%7D%20FILTER((BOUND(%3Fstart)%20%26%26%20%3Fstart%20%3E%3D%20%222010-01-01T00%3A00%3A00Z%22%5E%5Exsd%3AdateTime)%20%7C%7C%20(BOUND(%3Finception)%20%26%26%20%3Finception%20%3E%3D%20%222010-01-01T00%3A00%3A00Z%22%5E%5Exsd%3AdateTime)).%20FILTER(NOT%20EXISTS%20%7B%20%3Fitem%20wdt%3AP582%20%3Fend.%20%7D)%20%7D" \
  | jq -r '.results.bindings[0].count.value' 2>/dev/null); then
  echo "WIKIDATA_RECENT_ONGOING_CONFLICTS ${conflicts:-0}"
else
  echo "WIKIDATA_RECENT_ONGOING_CONFLICTS ERR"
fi

echo
echo "Audit artifacts: $TMP_DIR"
