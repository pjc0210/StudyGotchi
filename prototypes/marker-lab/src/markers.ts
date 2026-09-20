export type MarkerId =
  | 'ice-town'
  | 'ink-world'
  | 'celestial-garden'
  | 'heavy-industry'
  | 'future-utopia'
  | 'harbor-town'
  | 'academy-town'
  | 'wildwest'
  | 'volcanic'
  | 'egyptian-desert'
  | 'alpine'
  | 'swamp'
  | 'jungle'
  | 'forest'
  | 'city'
  | 'whimsical-land'
  | 'fractal-recursion'

export type PropCategory =
  | 'mountain'
  | 'brush-peak'
  | 'ring'
  | 'crane'
  | 'spire'
  | 'ship'
  | 'tower'
  | 'mesa'
  | 'volcano'
  | 'pyramid'
  | 'alpine-peak'
  | 'tree'
  | 'waterfall-tree'
  | 'round-tree'
  | 'building'
  | 'spiral-tower'
  | 'fractal-tree'

export interface MarkerProp {
  id: string
  label: string
  category: PropCategory
  height: number
  colors: readonly string[]
  emissive?: string
}

export interface MarkerDefinition {
  id: MarkerId
  name: string
  pedestal: {
    side: string
    top: string
    lip: string
    rim: string
  }
  props: readonly [MarkerProp, MarkerProp, MarkerProp?, MarkerProp?]
  accentObject: string
  silhouette: string
}

export const MARKERS: readonly MarkerDefinition[] = [
  {
    id: 'ice-town',
    name: 'Ice / Chilly Town',
    pedestal: {
      side: '#8fbfdc',
      top: '#eef4f7',
      lip: '#ffffff',
      rim: 'rounded snow lip, 12 lobes dripping 0.4 m over the edge',
    },
    props: [
      { id: 'snow-mountain', label: 'three-peak faceted snow range with exposed rock faces', category: 'mountain', height: 32, colors: ['#eef4f7', '#8fbfdc', '#c9bfd0'] },
      { id: 'red-cap-lighthouse', label: 'lighthouse with three bands and a red cap', category: 'tower', height: 28, colors: ['#f4e9d2', '#8fbfdc', '#c8524a'], emissive: '#ffe9a8' },
      { id: 'pine-trio', label: 'pine bouquet with snow caps', category: 'tree', height: 28, colors: ['#5f8f78', '#eef4f7'] },
      { id: 'timber-house-pair', label: 'crooked gabled winter-house cluster with snow roofs', category: 'building', height: 24, colors: ['#c8524a', '#5f9ea8', '#eef4f7'], emissive: '#ffe9a8' },
    ],
    accentObject: 'red-cap-lighthouse',
    silhouette: 'white cone over a blue cliff with one red dot',
  },
  {
    id: 'ink-world',
    name: 'Ink World',
    pedestal: {
      side: '#d9d2c4',
      top: '#f4efe6',
      lip: '#3a2f45',
      rim: 'deckle paper edge with one 0.4 m brush-stroke band',
    },
    props: [
      { id: 'brush-peak', label: 'brush-stroke peak fading into wash', category: 'brush-peak', height: 32, colors: ['#3a2f45', '#8c8698'] },
      { id: 'paper-pavilion', label: 'paper pavilion with ink roof lines', category: 'building', height: 28, colors: ['#f4efe6', '#3a2f45'] },
      { id: 'ink-blot-pine', label: 'three ink blots on one trunk', category: 'tree', height: 28, colors: ['#3a2f45'] },
      { id: 'paper-lantern', label: 'unlit paper lantern post', category: 'tower', height: 24, colors: ['#f4efe6', '#3a2f45'] },
    ],
    accentObject: 'seal-red-stamp',
    silhouette: 'black brush peak on a white disc',
  },
  {
    id: 'celestial-garden',
    name: 'Celestial Garden',
    pedestal: {
      side: '#4b4f8a',
      top: '#6b70b8',
      lip: '#dfe3ff',
      rim: 'pale rim with 12 star studs',
    },
    props: [
      { id: 'armillary', label: 'armillary orbit ring on a post', category: 'ring', height: 32, colors: ['#dfe3ff'] },
      { id: 'star-flower', label: 'giant star-flower', category: 'tree', height: 28, colors: ['#8fc9d8', '#f8d24a'], emissive: '#f8d24a' },
      { id: 'constellation-gazebo', label: 'six-post constellation gazebo', category: 'building', height: 28, colors: ['#dfe3ff'], emissive: '#dfe3ff' },
      { id: 'moon-pond', label: 'moon-pond basin', category: 'ring', height: 24, colors: ['#9fd3e0', '#dfe3ff'] },
    ],
    accentObject: 'star-flower',
    silhouette: 'tilted ring over an indigo disc',
  },
  {
    id: 'heavy-industry',
    name: 'Heavy Industry',
    pedestal: {
      side: '#9f9a96',
      top: '#b9b4b0',
      lip: '#6b5f7a',
      rim: 'riveted steel edge band with orange chevrons every 30 degrees',
    },
    props: [
      { id: 'gantry-crane', label: 'gantry crane with orange cab', category: 'crane', height: 32, colors: ['#6b5f7a', '#e8a13a'], emissive: '#ffe9a8' },
      { id: 'chimney-pair', label: 'chimney-stack pair with one smoke puff', category: 'tower', height: 28, colors: ['#9f9a96', '#fffaf3'] },
      { id: 'piston-press', label: 'piston press with moving ram', category: 'building', height: 28, colors: ['#9f9a96', '#6b5f7a'] },
      { id: 'pipe-run', label: 'pipe run with three elbows', category: 'building', height: 24, colors: ['#4f8fb0'] },
    ],
    accentObject: 'gantry-crane',
    silhouette: 'a T-shaped gantry over a grey disc',
  },
  {
    id: 'future-utopia',
    name: 'Future Utopia',
    pedestal: {
      side: '#c7dfd6',
      top: '#e3f2ec',
      lip: '#3fd1c9',
      rim: 'flush glass edge with a 0.3 m cyan light strip',
    },
    props: [
      { id: 'civic-spire', label: 'white civic spire with three cyan bands', category: 'spire', height: 32, colors: ['#ffffff', '#3fd1c9'], emissive: '#3fd1c9' },
      { id: 'transit-arch', label: 'transit arch with monorail loop', category: 'ring', height: 28, colors: ['#c7dfd6', '#3fd1c9'] },
      { id: 'garden-dome', label: 'glass garden dome', category: 'building', height: 28, colors: ['#c7dfd6', '#8fc48a'] },
      { id: 'hover-lamp', label: 'hover lamp on a stem with two rings', category: 'tower', height: 24, colors: ['#ffffff', '#3fd1c9'], emissive: '#3fd1c9' },
    ],
    accentObject: 'civic-spire',
    silhouette: 'a needle spire over a pale mint disc',
  },
  {
    id: 'harbor-town',
    name: 'Harbor Town',
    pedestal: {
      side: '#7f8f9c',
      top: '#a3aeb8',
      lip: '#5f6f7c',
      rim: 'cobble kerb with six mooring bollards and rope loops',
    },
    props: [
      { id: 'tall-ship', label: 'tall ship with cream sails', category: 'ship', height: 32, colors: ['#4a3c36', '#f4e9d2', '#f0b429'] },
      { id: 'warehouse-row', label: 'three gabled warehouses', category: 'building', height: 28, colors: ['#5f9ea8', '#f4e9d2', '#6d7f96'] },
      { id: 'harbour-crane', label: 'timber harbour crane', category: 'crane', height: 28, colors: ['#786557'] },
      { id: 'buoy-bollard', label: 'buoy and bollard cluster', category: 'tower', height: 24, colors: ['#f0b429', '#3a2f45'] },
    ],
    accentObject: 'tall-ship',
    silhouette: 'a mast and sail over a blue-grey disc',
  },
  {
    id: 'academy-town',
    name: 'Academy Town',
    pedestal: {
      side: '#a85a4a',
      top: '#9fcf7a',
      lip: '#d9d2c4',
      rim: 'stone coping course over brick with 12 engaged buttresses',
    },
    props: [
      { id: 'bell-tower', label: 'brick bell tower with white cupola and verdigris cap', category: 'tower', height: 32, colors: ['#a85a4a', '#f4efe6', '#6fa89a'] },
      { id: 'library', label: 'four-column library with pediment', category: 'building', height: 28, colors: ['#a85a4a', '#f4efe6'] },
      { id: 'campus-row', label: 'lecture hall and dorm row', category: 'building', height: 28, colors: ['#a85a4a', '#f4efe6'], emissive: '#ffe9a8' },
      { id: 'quad-oak', label: 'quad oak with bench', category: 'tree', height: 24, colors: ['#4f8a4a', '#786557'] },
    ],
    accentObject: 'tower-pennant',
    silhouette: 'brick disc with a green top and a white cupola',
  },
  {
    id: 'wildwest',
    name: 'Wild West',
    pedestal: {
      side: '#a0522d',
      top: '#d9b07a',
      lip: '#c2925a',
      rim: 'three undercut sandstone strata bands',
    },
    props: [
      { id: 'mesa-butte', label: 'flat-top mesa butte', category: 'mesa', height: 32, colors: ['#a0522d', '#d9b07a'] },
      { id: 'windpump', label: 'windpump with eight-blade vane', category: 'tower', height: 28, colors: ['#8b5a3c'] },
      { id: 'saloon', label: 'saloon with false front', category: 'building', height: 28, colors: ['#c2925a', '#8b5a3c'] },
      { id: 'saguaro-pair', label: 'saguaro pair', category: 'tree', height: 24, colors: ['#4f8a4a'] },
    ],
    accentObject: 'saguaro-pair',
    silhouette: 'a flat-top butte over an ochre disc',
  },
  {
    id: 'volcanic',
    name: 'Volcanic',
    pedestal: {
      side: '#3a2f45',
      top: '#c9a08f',
      lip: '#8a4a3f',
      rim: 'basalt crust with six ember cracks',
    },
    props: [
      { id: 'crater-cone', label: 'crater cone with glowing rim', category: 'volcano', height: 32, colors: ['#8a4a3f', '#ff7a3a'], emissive: '#ff7a3a' },
      { id: 'basalt-columns', label: 'five-column basalt cluster', category: 'mountain', height: 28, colors: ['#3a2f45'] },
      { id: 'forge-house', label: 'forge house with open door glow', category: 'building', height: 28, colors: ['#3a2f45', '#c9a08f', '#ff7a3a'], emissive: '#ff7a3a' },
      { id: 'ember-rock', label: 'ember rock and smoke puff', category: 'mountain', height: 24, colors: ['#8a4a3f', '#ff7a3a', '#fffaf3'], emissive: '#ff7a3a' },
    ],
    accentObject: 'crater-cone',
    silhouette: 'a dark cone with an orange rim',
  },
  {
    id: 'egyptian-desert',
    name: 'Egyptian Desert',
    pedestal: {
      side: '#d2a95e',
      top: '#efd9a2',
      lip: '#e2b98a',
      rim: 'three wind-ripple strata bands',
    },
    props: [
      { id: 'stepped-pyramid', label: 'stepped pyramid', category: 'pyramid', height: 32, colors: ['#efd9a2', '#d2a95e'] },
      { id: 'obelisk', label: 'obelisk with hieroglyph band', category: 'tower', height: 28, colors: ['#e2b98a', '#d2a95e'] },
      { id: 'oasis', label: 'oasis palm pair over a pool', category: 'tree', height: 28, colors: ['#4f8a4a', '#8b5a3c', '#4fb0b8'] },
      { id: 'pylon-gate', label: 'pylon gate', category: 'building', height: 24, colors: ['#b87a50', '#efd9a2'] },
    ],
    accentObject: 'oasis',
    silhouette: 'a pyramid over a sand disc',
  },
  {
    id: 'alpine',
    name: 'Alpine',
    pedestal: {
      side: '#8d9299',
      top: '#86b26e',
      lip: '#a9aeb5',
      rim: 'split-granite ledge with turf tufts and six snow-dusted notches',
    },
    props: [
      { id: 'twin-peak', label: 'jagged twin peak with snow caps', category: 'alpine-peak', height: 32, colors: ['#8d9299', '#eef4f7'] },
      { id: 'cable-pylon', label: 'cable pylon with orange gondola', category: 'tower', height: 28, colors: ['#6d7f96', '#d9622b'] },
      { id: 'chalet', label: 'wide-roof chalet', category: 'building', height: 28, colors: ['#786557', '#f4e9d2'] },
      { id: 'fir-pair', label: 'fir pair', category: 'tree', height: 24, colors: ['#4f8a4a'] },
    ],
    accentObject: 'cable-pylon',
    silhouette: 'two grey spikes and one diagonal cable',
  },
  {
    id: 'swamp',
    name: 'Swamp',
    pedestal: {
      side: '#4f5a3f',
      top: '#6f7f5a',
      lip: '#a3a05f',
      rim: 'reed-tuft edge with root knuckles and duckweed patches',
    },
    props: [
      { id: 'bald-cypress', label: 'bald cypress with hanging moss', category: 'tree', height: 32, colors: ['#5a6e50', '#a3b080'] },
      { id: 'stilt-hut', label: 'stilt hut on a boardwalk', category: 'building', height: 28, colors: ['#786557'] },
      { id: 'lantern-post', label: 'paper lantern post', category: 'tower', height: 28, colors: ['#f2c14e', '#786557'], emissive: '#f2c14e' },
      { id: 'reeds-lily', label: 'reed and lily clump', category: 'tree', height: 24, colors: ['#a3a05f', '#d66fa8'] },
    ],
    accentObject: 'lantern-post',
    silhouette: 'a tall dark trunk with drooping moss over an olive disc',
  },
  {
    id: 'jungle',
    name: 'Jungle',
    pedestal: {
      side: '#4f8a4a',
      top: '#6fae6a',
      lip: '#4f8a4a',
      rim: '1.2 m hanging vine fringe with fruit dots',
    },
    props: [
      { id: 'waterfall-tree', label: 'canopy tree over a waterfall cliff', category: 'waterfall-tree', height: 32, colors: ['#4f8a4a', '#5fc9c9'] },
      { id: 'palm', label: 'palm', category: 'tree', height: 28, colors: ['#4f8a4a', '#8b5a3c'] },
      { id: 'ruin-stack', label: 'four-block ruin stack', category: 'building', height: 28, colors: ['#b7a58f'] },
      { id: 'tiki-torch', label: 'tiki torch', category: 'tower', height: 24, colors: ['#8b5a3c', '#f2b84f'], emissive: '#f2b84f' },
    ],
    accentObject: 'tiki-torch',
    silhouette: 'an umbrella canopy with one white water stripe',
  },
  {
    id: 'forest',
    name: 'Forest',
    pedestal: {
      side: '#6fa86a',
      top: '#8fc48a',
      lip: '#a9d69a',
      rim: 'grass-tuft edge with root knuckles',
    },
    props: [
      { id: 'great-round-tree', label: 'great round tree', category: 'round-tree', height: 32, colors: ['#4f8a4a', '#8b5a3c'] },
      { id: 'round-tree-pair', label: 'small and large round-tree pair', category: 'round-tree', height: 28, colors: ['#4f8a4a', '#8b5a3c'] },
      { id: 'mushroom-cottage', label: 'mushroom cottage', category: 'building', height: 28, colors: ['#d9765c', '#f2e3c6'] },
      { id: 'log-fern', label: 'log and fern clump', category: 'tree', height: 24, colors: ['#8b5a3c', '#4f8a4a'] },
    ],
    accentObject: 'mushroom-cottage',
    silhouette: 'one big green ball over a green disc',
  },
  {
    id: 'city',
    name: 'City',
    pedestal: {
      side: '#b98bb0',
      top: '#d9c3d6',
      lip: '#f6ecd2',
      rim: 'kerb and cobble ring with ink edge',
    },
    props: [
      { id: 'tower-block', label: 'tower block with roof and lit facets', category: 'tower', height: 32, colors: ['#e6f2fb', '#b98bb0'], emissive: '#ffe9a8' },
      { id: 'clock-tower', label: 'clock tower with oversized face', category: 'tower', height: 28, colors: ['#e6f2fb', '#b98bb0'] },
      { id: 'townhouse-pair', label: 'townhouse pair with awnings', category: 'building', height: 28, colors: ['#e6f2fb', '#e88a8a'], emissive: '#ffe9a8' },
      { id: 'lamp-planter', label: 'lamp post and planter tree', category: 'tree', height: 24, colors: ['#6b5f7a', '#4f8a4a'], emissive: '#ffe9a8' },
    ],
    accentObject: 'townhouse-pair',
    silhouette: 'a boxy tower over a mauve disc',
  },
  {
    id: 'whimsical-land',
    name: 'Whimsical Land',
    pedestal: {
      side: '#f7c8d8',
      top: '#fff1c9',
      lip: '#8fc9d8',
      rim: 'scalloped edge with alternating candy stripes',
    },
    props: [
      { id: 'spiral-tower', label: 'spiral tower with a 12 degree lean', category: 'spiral-tower', height: 32, colors: ['#f7c8d8', '#8fc9d8'] },
      { id: 'oversized-flower', label: 'oversized flower with a 3 m bloom', category: 'tree', height: 28, colors: ['#8fc9d8', '#fff1c9'] },
      { id: 'upside-down-house', label: 'upside-down house balanced on its ridge', category: 'building', height: 28, colors: ['#f7c8d8', '#fff1c9'] },
      { id: 'checker-spiral', label: 'low checker-path spiral', category: 'ring', height: 24, colors: ['#8fc9d8', '#fff1c9'] },
    ],
    accentObject: 'spiral-tower',
    silhouette: 'a leaning tower over a pink scalloped disc',
  },
  {
    id: 'fractal-recursion',
    name: 'Fractal Recursion',
    pedestal: {
      side: '#8a90a8',
      top: '#a8b0c4',
      lip: '#dfe3ff',
      rim: 'three one-third-scale sub-bouquets budding from the plinth edge',
    },
    props: [
      { id: 'pythagoras-tree', label: 'Pythagoras tree of branching squares', category: 'fractal-tree', height: 32, colors: ['#a8b0c4'] },
      { id: 'sierpinski-pyramid', label: 'stepped Sierpinski pyramid', category: 'pyramid', height: 28, colors: ['#8a90a8', '#dfe3ff'] },
      { id: 'spiral-shell', label: 'five-turn spiral shell', category: 'ring', height: 28, colors: ['#dfe3ff'] },
      { id: 'marker-copy', label: 'one-third-scale copy of this marker', category: 'fractal-tree', height: 24, colors: ['#8a90a8', '#a8b0c4', '#ff7ad9'] },
    ],
    accentObject: 'marker-copy',
    silhouette: 'a branching square tree over a disc that repeats itself',
  },
] as const
