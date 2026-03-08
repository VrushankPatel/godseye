# Godseye Feed Research and Coverage Notes

Last updated: 2026-03-08

This note summarizes direct `curl` checks and source behavior observations used to improve coverage.

## 1) Flight Feeds (Global + Regional)

Checked endpoints:
- `https://api.adsb.one/v2/point/0/0/10000`
- `https://api.airplanes.live/v2/point/0/0/10000`
- `https://api.adsb.lol/v2/point/0/0/10000`
- `https://opensky-network.org/api/states/all`
- `https://opensky-network.org/api/states/all?lamin=6&lomin=68&lamax=36&lomax=98`

Observed sample counts in successful runs:
- ADSB.one global: `12,349`
- Airplanes.live global: `12,349`
- ADSB.lol global: `10,905` to `10,989`
- OpenSky global: `10,822`
- OpenSky India bbox: `214`

Merged ADS-B mirrors (`adsb.one + airplanes.live + adsb.lol`) yielded higher unique aircraft counts than any one source alone.
Sample merged global count: `12,871` to `13,728` unique hex IDs depending on fetch time.

Regional observations from merged ADS-B sample:
- India: ~`281-290`
- Africa: ~`427-461`
- East Asia: ~`185-230`
- South America: ~`303-315`

## 2) Satellite and Space Feeds

- CelesTrak active TLE direct feed returned about `14,661` records (`43,983` lines / 3).
- NOAA SWPC Aurora grid returned `65,160` cells in a sample pull.
- NOAA SWPC X-ray flare feed returned `29` events in one sample pull.

## 3) Earth and Hazard Feeds

Sample counts from successful runs:
- USGS all-hour earthquakes: `2`
- USGS M2.5 day earthquakes: `62`
- NOAA/NWS active alerts: `447`
- GDACS event feed: `100`
- NOAA NDBC buoys: `794`
- NASA FIRMS MODIS 24h hotspots: `14,913`

## 4) CCTV Feeds

- Curated `worldcams` in repository currently: `777` feeds.
- Top country counts in local curated set are US-heavy, confirming global imbalance in available easy-to-embed streams.
- Caltrans feed catalog exposes `3,167` camera entries, but not all are stream-capable.
- TfL JamCams returned `884` items in sample pull.

## 5) Conflict / War Data (Keyless)

Given keyless-only frontend constraint, a public Wikidata SPARQL query was added for recent ongoing conflicts with coordinates.

Sample count from query constraints (`start/inception >= 2010` and no end date):
- `99` geocoded conflict items.

## 6) Why Some Regions Still Look Sparse

Even with broader ingestion, visible density depends on external source coverage:
- ADS-B / OpenSky density is receiver-driven and uneven by region.
- Public CCTV availability is highly uneven and often non-streaming outside specific municipalities.
- Some public APIs are intermittently unavailable from the browser due CORS/rate/network routing.

## 7) Implemented Mitigations

- Added third ADS-B mirror (`adsb.lol`) to improve union coverage.
- Added rotating regional ADS-B point pulls to increase non-US/non-Europe representation.
- Kept OpenSky global + India bbox in mix.
- Added new `CONFLICTS` layer from Wikidata SPARQL.
- Increased satellite render cap and traffic feed cap.
- Added `scripts/feed_audit.sh` for repeatable curl-based checks.
