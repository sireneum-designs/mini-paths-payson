// Locations and example postcards for the Mini Paths of Payson, AZ.
// Pin coordinates are lat/lon, derived from the community reference map's
// QGIS-documented bbox (see uploads/initial map extents.xml):
//   lon: -111.37063659 (west)  →  -111.26149428 (east)
//   lat:   34.28709268 (north) →    34.20764047 (south)
// These are the real geographic positions of each numbered spot around Payson.

const THEMES = [
  { id: 'education', label: 'education', color: 'oklch(62% 0.09 70)'  },   // warm ochre
  { id: 'wellness',  label: 'wellness',  color: 'oklch(58% 0.08 160)' },   // sage
  { id: 'recreation',label: 'recreation',color: 'oklch(56% 0.10 40)'  },   // terracotta
  { id: 'memory',    label: 'memory',    color: 'oklch(52% 0.07 280)' },   // dusk
];

// Target map extent — from QGIS bookmark in uploads/initial map extents.xml.
const MAP_BBOX = {
  west:  -111.37063659,
  east:  -111.26149428,
  south:   34.20764047,
  north:   34.28709268,
};

// Actual bbox of the exported georeferenced basemap PNG (from its .pgw world file).
// N/S match the QGIS bookmark; E/W extend slightly to preserve the image aspect ratio.
const BASEMAP_IMAGE = {
  src: 'src/geobasemap.png',
  west:  -111.38514387,
  east:  -111.24696674,
  north:   34.28708849,
  south:   34.20762789,
};

// 21 real pin coordinates (lat/lon), matched with the numbered legend from the PDF.
const LOCATIONS = [
  { id: 'horse-camp', num: 1, name: 'horse camp + houston trail', lat: 34.27092, lon: -111.31524 },
  { id: 'community-garden', num: 2, name: 'payson community garden', lat: 34.26662, lon: -111.31677 },
  { id: 'houston-loop', num: 3, name: 'houston loop trail', lat: 34.26808, lon: -111.26875 },
  { id: 'monument-peak', num: 4, name: 'monument peak trail', lat: 34.24277, lon: -111.26901 },
  { id: 'boulders-loop', num: 5, name: 'boulders loop trail', lat: 34.22956, lon: -111.27573 },
  { id: 'cypress', num: 6, name: 'cypress trail', lat: 34.22742, lon: -111.29268 },
  { id: 'apache-trust', num: 7, name: 'Dilzhę’é Apache trust land', lat: 34.22457, lon: -111.31671 },
  { id: 'apache-reservation', num: 8, name: 'Dilzhę’é Apache reservation', lat: 34.22684, lon: -111.32571 },
  { id: 'event-center', num: 9, name: 'event center', lat: 34.22495, lon: -111.32976 },
  { id: 'peach-orchard', num: 10, name: 'peach orchard trail', lat: 34.22480, lon: -111.33363 },
  { id: 'peach-loop', num: 11, name: 'peach loop trail', lat: 34.22953, lon: -111.35439 },
  { id: 'golf-course', num: 12, name: 'payson golf course', lat: 34.23516, lon: -111.34658 },
  { id: 'green-valley', num: 13, name: 'green valley park', lat: 34.23467, lon: -111.33893 },
  { id: 'american-gulch', num: 14, name: 'american gulch trail', lat: 34.25287, lon: -111.36240 },
  { id: 'rumsey', num: 15, name: 'rumsey park', lat: 34.24799, lon: -111.32852 },
  { id: 'middle-high', num: 16, name: 'payson middle + high school', lat: 34.24041, lon: -111.32702 },
  { id: 'granite-dells', num: 17, name: 'granite dells park', lat: 34.23892, lon: -111.30554 },
  { id: 'ranger-station', num: 18, name: 'payson ranger station', lat: 34.24293, lon: -111.30584 },
  { id: 'college-center', num: 19, name: 'college center', lat: 34.24645, lon: -111.30505 },
  { id: 'airport', num: 20, name: 'airport', lat: 34.25732, lon: -111.33468 },
  { id: 'elementary', num: 21, name: 'payson elementary school', lat: 34.26054, lon: -111.31448 },
];

// Example postcards. Drawings are rendered as inline SVG "sketches"
// (a stand-in for real scanned community postcards). Keeps the
// handmade feel while we wait for real submissions.
const POSTCARDS = [
  {
    id: 'pc-01',
    locationId: 'houston-loop',
    category: 'wellness',
    caption: 'when i take this path i feel quiet.',
    body: "the loop is short enough i can do it before school. most mornings there's nobody else. one time i saw two elk just standing in the wash, looking right at me.",
    signature: '— marla, 14',
    pathLabel: 'morning loop',
    sketch: 'houston-loop',
    palette: 'forest',
  },
  {
    id: 'pc-02',
    locationId: 'green-valley',
    category: 'memory',
    caption: 'when i take this path i feel like a kid again.',
    body: "my grandpa used to take me fishing on the pond on saturdays. i take my own kids now. same ducks, probably different ducks, who knows.",
    signature: '— j.',
    pathLabel: 'saturday mornings with grandpa',
    sketch: 'green-valley',
    palette: 'sky',
  },
  {
    id: 'pc-03',
    locationId: 'community-garden',
    category: 'education',
    caption: 'when i take this path i feel curious.',
    body: "mrs. carver showed our third grade class how the monsoon garden works. we came back in september and it was twice as tall as us.",
    signature: '— payson elementary, room 7',
    pathLabel: 'the garden visit',
    sketch: 'community-garden',
    palette: 'ochre',
  },
  {
    id: 'pc-04',
    locationId: 'monument-peak',
    category: 'recreation',
    caption: 'when i take this path i feel small, but in a good way.',
    body: "you get up there and the rim just goes and goes. we always stop at the flat rock at the top and eat trail mix and not talk for a while.",
    signature: '— the hernandez family',
    pathLabel: 'the thinking rock',
    sketch: 'monument-peak',
    palette: 'dusk',
  },
  {
    id: 'pc-05',
    locationId: 'rumsey',
    category: 'wellness',
    caption: 'when i take this path i feel centered.',
    body: "i walk the loop at rumsey three times after dinner. the cottonwoods are loud when the wind comes through. that's my thinking time.",
    signature: '— ed, 71',
    pathLabel: 'after-dinner loop',
    sketch: 'rumsey',
    palette: 'forest',
  },
  {
    id: 'pc-06',
    locationId: 'american-gulch',
    category: 'memory',
    caption: 'when i take this path i feel connected to the water.',
    body: "the gulch is dry most of the year. but after a good monsoon you can hear it before you see it. my daughter learned to skip rocks here.",
    signature: '— r.',
    pathLabel: 'listening for water',
    sketch: 'gulch',
    palette: 'sky',
  },
];

// Featured curated paths — sequences of postcards meant to be walked together.
const FEATURED_PATHS = [
  {
    id: 'morning-loops',
    title: 'Morning loops',
    subtitle: 'three short walks people do before the day gets loud.',
    postcardIds: ['pc-01', 'pc-05', 'pc-04'],
  },
  {
    id: 'with-kids',
    title: 'With kids',
    subtitle: 'paths folks take with the small people in their lives.',
    postcardIds: ['pc-03', 'pc-02', 'pc-06'],
  },
  {
    id: 'quiet-places',
    title: 'Quiet places',
    subtitle: "for when you want the rim country to do most of the talking.",
    postcardIds: ['pc-04', 'pc-06', 'pc-01'],
  },
];

Object.assign(window, { THEMES, LOCATIONS, POSTCARDS, FEATURED_PATHS, MAP_BBOX, BASEMAP_IMAGE });
