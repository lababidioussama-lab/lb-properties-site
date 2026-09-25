/**
 * Off-plan projects the practice can place allocations in.
 *
 * SOURCING RULE — read before editing.
 * Every field here is transcribed from the developer brochures in
 * ~/Desktop/brouchre. Those brochures are marketing documents: they carry
 * location, unit mix, amenities and developer, and with one exception they
 * carry NO price, NO payment plan and NO handover date.
 *
 * So those three fields are deliberately optional and mostly absent. A
 * listing that renders "Price on request" is telling the truth; a listing
 * that renders an invented "from AED 1.2M" is a false-advertising problem
 * and, for a RERA-registered brokerage, a licensing one. Do not fill these
 * in from portal listings or memory — only from a developer price list,
 * and date it when you do.
 *
 * The single price-adjacent fact any brochure states is Elitz 2's
 * "1% per month" plan, which is quoted verbatim below.
 */

export interface Project {
  slug: string;
  name: string;
  developer: string;
  community: string;
  /** Unit mix exactly as the brochure words it. */
  unitMix: string;
  /** Marketing line, trimmed from the brochure's own copy. */
  blurb: string;
  /** Two or three sentences for the detail view, same sourcing rule. */
  about: string;
  /** Brochure-stated drive times, `label` → `minutes`. */
  connectivity?: { label: string; minutes: number }[];
  highlights: string[];
  /** Only when the brochure states it. Absent renders as "on request". */
  paymentPlan?: string;
  handover?: string;
  priceFrom?: number;
  /** Card hero. */
  image: string;
  /** Gallery for the detail view, extracted from the same brochure. */
  images: string[];
  /** Which file in ~/Desktop/brouchre this came from, for re-checking. */
  source: string;
}

export const PROJECTS: Project[] = [
  {
    slug: "palace-beach-residence",
    name: "Palace Beach Residence",
    developer: "Emaar",
    community: "Emaar Beachfront",
    unitMix: "1–4 bedroom apartments, 3–4 bedroom townhouses, penthouses",
    blurb:
      "The first Palace-branded residence at Emaar Beachfront, set between the Arabian Gulf and the city skyline with 1.5 km of private beach.",
    about:
      "Emaar Beachfront is a man-made island district between Dubai Marina and the Palm, and Palace Beach Residence is the first address there to carry the Palace hotel brand. Two towers of 29 and 42 floors sit directly on 1.5 km of private sand, with the podium deck, health club and community retail arranged so residents rarely need to leave the island. Layouts run from one-bedroom apartments through townhouses to penthouses, and every unit is oriented to either the Gulf or the skyline.",
    connectivity: [
      { label: "Dubai Marina & Sheikh Zayed Road", minutes: 5 },
      { label: "Downtown Dubai & DXB", minutes: 25 },
    ],
    highlights: [
      "Private beach exclusively for residents",
      "Two towers — 29 and 42 floors",
      "Podium deck with swimming and kids' pools",
      "Health club and community retail",
    ],
    image: "/projects/palace-beach-residence-3.jpg",
    images: [
      "/projects/palace-beach-residence-3.jpg",
      "/projects/palace-beach-residence-2.jpg",
      "/projects/palace-beach-residence-5.jpg",
      "/projects/palace-beach-residence-4.jpg",
    ],
    source: "ef2d1341-3c33-4bfc-a495-9fc3f3b2c3b5.pdf",
  },
  {
    slug: "grand-polo-equestra",
    name: "Grand Polo Club & Resort — Equestra",
    developer: "Emaar",
    community: "Grand Polo Club & Resort",
    unitMix: "Townhouse plexes to five-bedroom residences",
    blurb:
      "A masterplan built around equestrian prestige, with linear parks looping between the residences and the polo fields at its heart.",
    about:
      "Grand Polo Club & Resort is an Emaar masterplan organised around working polo fields, stables and a clubhouse, with linear parks branching out to connect each residential cluster. Equestra is one of sixteen enclaves inside it, reached through the grounds rather than off a main road. Homes run from townhouse plexes to five-bedroom residences, and the location puts Al Maktoum International and The Oasis five minutes away.",
    connectivity: [
      { label: "Al Maktoum International Airport", minutes: 5 },
      { label: "The Oasis", minutes: 5 },
      { label: "Expo 2020", minutes: 10 },
      { label: "Downtown Dubai", minutes: 30 },
    ],
    highlights: [
      "Polo fields, stables and clubhouse",
      "Forest walk and cycling network",
      "Sculpted linear parks",
      "Mini golf and fitness areas",
    ],
    image: "/projects/grand-polo-equestra-2.jpg",
    images: [
      "/projects/grand-polo-equestra-2.jpg",
      "/projects/grand-polo-equestra-1.jpg",
      "/projects/grand-polo-equestra-4.jpg",
      "/projects/grand-polo-equestra-3.jpg",
      "/projects/grand-polo-equestra-5.jpg",
    ],
    source: "0f2c5510-62fe-4c7b-b022-6491a678788d.pdf",
  },
  {
    slug: "the-cove-creek-island",
    name: "The Cove",
    developer: "Emaar",
    community: "Creek Island, Dubai Creek Harbour",
    unitMix:
      "1–3 bedroom apartments, 2–3 bedroom duplexes, 2–4 bedroom townhouses",
    blurb:
      "A waterfront address on Creek Island, where a green central park, marina and yacht club sit inside Dubai Creek Harbour's 7.4 million sqm masterplan.",
    about:
      "Creek Island sits at the centre of Dubai Creek Harbour, a 7.4 million sqm district with half a million sqm of parks. The Cove faces the water directly, with floor-to-ceiling glazing across the living spaces and a marina, yacht club and central park within the district. Four metro stations, three bridges and water taxis to Downtown make it unusually well connected for a waterfront address.",
    highlights: [
      "Floor-to-ceiling windows over the creek",
      "Four metro stations serving the district",
      "Water taxis to Downtown Dubai",
      "Creek Marina yacht club five minutes away",
    ],
    image: "/projects/the-cove-creek-island-1.jpg",
    images: [
      "/projects/the-cove-creek-island-1.jpg",
      "/projects/the-cove-creek-island-4.jpg",
      "/projects/the-cove-creek-island-3.jpg",
      "/projects/the-cove-creek-island-2.jpg",
    ],
    source: "8a035d75-52c8-4888-8319-417be2a41d0e.pdf",
  },
  {
    slug: "creek-bay-creek-haven",
    name: "Creek Bay & Creek Haven",
    developer: "Emaar",
    community: "Sanctuary District, Dubai Creek Harbour",
    unitMix: "Waterfront residences — mix on request",
    blurb:
      "The Sanctuary District, a one-minute walk from the waterfront, beside the Ras Al Khor wildlife sanctuary and its AED 650 million transformation.",
    about:
      "The Sanctuary District is the newest phase of Dubai Creek Harbour, roughly one million sqm, built a minute's walk from the waterfront and directly beside the Ras Al Khor Wildlife Sanctuary. A AED 650 million transformation of the sanctuary — expanded wetlands, mangroves and flamingo habitat — turns the protected land next door into an amenity rather than a boundary. Emaar is positioning it as the only true naturefront address in the city.",
    highlights: [
      "Roughly 1 million sqm GFA district",
      "Beside Ras Al Khor Wildlife Sanctuary",
      "Mangroves and expanded wetlands",
      "Sanctuary Walk and The Estuary",
    ],
    image: "/projects/creek-bay-creek-haven-3.jpg",
    images: [
      "/projects/creek-bay-creek-haven-3.jpg",
      "/projects/creek-bay-creek-haven-4.jpg",
      "/projects/creek-bay-creek-haven-1.jpg",
    ],
    source: "DCH Creek Bay Creek Haven Key Sales Info.pdf",
  },
  {
    slug: "aquarise",
    name: "Aquarise",
    developer: "Binghatti",
    community: "Business Bay",
    unitMix: "Studios, 1–3 bedroom apartments",
    blurb:
      "A façade shaped around the curves of water — glass and light reflecting the changing hues of the Dubai sky, in the middle of Business Bay.",
    about:
      "Binghatti's Business Bay tower takes the curve of moving water as its façade logic, so the elevation reads as bands of glass and light rather than a flat curtain wall. It sits within walking reach of Dubai Mall, DIFC and the canal, and Binghatti runs its own in-house letting, maintenance and resale desk — which matters for an investor who does not intend to live in the unit.",
    highlights: [
      "Walking distance to Dubai Mall and DIFC",
      "Sculpted water-inspired façade",
      "Resort deck with skyline views",
      "Binghatti in-house management and resale desk",
    ],
    image: "/projects/aquarise-3.jpg",
    images: [
      "/projects/aquarise-3.jpg",
      "/projects/aquarise-5.jpg",
      "/projects/aquarise-4.jpg",
      "/projects/aquarise-2.jpg",
    ],
    source: "Aquarise Digital Brochure.pdf",
  },
  {
    slug: "elitz-2",
    name: "Elitz 2",
    developer: "Danube Properties",
    community: "Jumeirah Village Circle",
    unitMix: "Studios, 1, 2 and 3 BHK apartments, plus retail",
    blurb:
      "Twin towers in JVC following the sell-out success of Elitz, with more than forty amenities and Danube's signature monthly payment structure.",
    about:
      "Danube returned to Jumeirah Village Circle with Elitz 2 after the original Elitz sold out, this time as twin towers combining apartments, retail and commercial floors. The amenity count runs past forty and is unusually broad for the price band: open-air cinema, cricket pitch, mini golf, aquatic gym, spa, business centre and daycare. The 1% per month payment structure is Danube's signature and the reason the launches clear quickly.",
    connectivity: [
      { label: "Al Khail Road", minutes: 2 },
      { label: "Sheikh Zayed Road", minutes: 8 },
      { label: "Dubai Marina", minutes: 14 },
      { label: "Dubai Mall / Burj Khalifa", minutes: 15 },
    ],
    highlights: [
      "40+ amenities across community, health and sport",
      "Open-air cinema, cricket pitch and mini golf",
      "Aquatic gym, spa and jacuzzi",
      "Business centre and daycare",
    ],
    // The one payment term any of these brochures actually states.
    paymentPlan: "1% per month",
    image: "/projects/elitz-2.jpg",
    images: [
      "/projects/elitz-2.jpg",
      "/projects/elitz-2-1.jpg",
      "/projects/elitz-2-2.jpg",
      "/projects/elitz-2-5.jpg",
      "/projects/elitz-2-4.jpg",
    ],
    source: "de10bf31-da6c-4129-95e8-ce8a056d87f8.pdf",
  },
  {
    slug: "cove-edition-iii",
    name: "Cove Edition III",
    developer: "Imtiaz",
    community: "Dubailand",
    unitMix: "Studios and 1–2 bedroom apartments",
    blurb:
      "The third Cove edition in Dubailand — homes built around functionality and quiet, within reach of Global Village and Academic City.",
    about:
      "The third instalment of Imtiaz's Cove series, set in Dubailand within reach of Global Village, Academic City and the Plantation Equestrian & Polo Club. The elevation is stepped with planted terraces, and the interiors are pitched at buyers who want the finish level of a central tower without the central price. Studios and one- to two-bedroom layouts.",
    highlights: [
      "Landscaped terraces across the elevation",
      "Full fitness floor",
      "Near Global Village and Academic City",
      "Close to Plantation Equestrian & Polo Club",
    ],
    image: "/projects/cove-edition-iii-3.jpg",
    images: [
      "/projects/cove-edition-iii-3.jpg",
      "/projects/cove-edition-iii-5.jpg",
      "/projects/cove-edition-iii-2.jpg",
    ],
    source: "967b9fbd-dca3-432a-bf35-686407627984.pdf",
  },
  {
    slug: "asayel-mjl",
    name: "Asayel — Building 2",
    developer: "Dubai Holding",
    community: "Madinat Jumeirah Living",
    unitMix: "1–4 bedroom apartments",
    blurb:
      "A low-rise collection across from Madinat Jumeirah, wrapped in wadis and oases, with Burj Al Arab views from an address you cannot rebuild.",
    about:
      "Madinat Jumeirah Living sits directly across from the Madinat Jumeirah resort, connected by a footbridge, and is one of the few genuinely low-rise freehold districts this close to the beach. Asayel Building 2 offers one- to four-bedroom apartments in traditional Arabesque architecture, wrapped in wadis and shaded walkways, with Burj Al Arab views from the upper floors. Developed by Dubai Holding.",
    highlights: [
      "Opposite Madinat Jumeirah resort",
      "Traditional Arabesque architecture",
      "Resort-scale pool decks",
      "Walkable to Souk Madinat and the beach",
    ],
    image: "/projects/asayel-mjl-1.jpg",
    images: [
      "/projects/asayel-mjl-1.jpg",
      "/projects/asayel-mjl-2.jpg",
      "/projects/asayel-mjl-3.jpg",
      "/projects/asayel-mjl-4.jpg",
    ],
    source: "ca5e9388-ab80-44d5-a7e3-4f7c79af664a.pdf",
  },
  {
    slug: "creek-vistas-heights",
    name: "Creek Vistas Heights",
    developer: "Sobha",
    community: "Sobha Hartland, Mohammed Bin Rashid City",
    unitMix: "1, 2 and 3 bedroom apartments",
    blurb:
      "Two towers of 64 storeys at Sobha Hartland, angled so the Dubai Canal sits on one side and the Downtown skyline on the other.",
    about:
      "Sobha builds and finishes in-house rather than contracting out, which is the practical reason its handover quality is quoted the way it is. Creek Vistas Heights is two towers close to Downtown Dubai, rising 64 storeys within the Sobha Hartland masterplan, with the Dubai Canal on one aspect and the city skyline on the other. Layouts run one to three bedrooms and every floor plate is drawn around the view rather than the core.",
    highlights: [
      "Two towers, 64 storeys",
      "Dubai Canal and Downtown skyline aspects",
      "Inside the Sobha Hartland masterplan",
      "Developer-controlled build and finish",
    ],
    image: "/projects/creek-vistas-heights-4.jpg",
    images: [
      "/projects/creek-vistas-heights-4.jpg",
      "/projects/creek-vistas-heights-3.jpg",
    ],
    source: "Sohba.pdf",
  },
  {
    slug: "creek-vistas-reserve",
    name: "Creek Vistas Reserve",
    developer: "Sobha",
    community: "Sobha Hartland, Mohammed Bin Rashid City",
    unitMix: "Studios, 1 and 2 bedroom apartments",
    blurb:
      "Far from the ordinary, yet within reach — a green-belt address inside Sobha Hartland, minutes from Downtown and Ras Al Khor.",
    about:
      "Sobha Hartland is an eight-million-sqft masterplan in Mohammed Bin Rashid City with roughly 30% of its area given to green space, which is unusual this close to the centre. Creek Vistas Reserve sits inside it with studios through two-bedroom layouts, and the amenity deck runs to a gymnasium, spa, tennis courts, yoga and meditation zones and jogging tracks. Downtown and the Ras Al Khor sanctuary are both a short drive.",
    highlights: [
      "Gymnasium, spa and tennis courts",
      "Yoga and meditation zones",
      "Jogging and walking tracks",
      "Green-belt setting inside Sobha Hartland",
    ],
    image: "/projects/creek-vistas-reserve-5.jpg",
    images: [
      "/projects/creek-vistas-reserve-5.jpg",
      "/projects/creek-vistas-reserve-3.jpg",
      "/projects/creek-vistas-reserve-1.jpg",
    ],
    source: "ec58affe-3a9e-4753-8f79-a453ce0240cd.pdf",
  },
  {
    slug: "palm-view",
    name: "Palm View",
    developer: "Nakheel",
    community: "Palm Jumeirah",
    unitMix: "Studios to 4 bedroom fully furnished residences",
    blurb:
      "Fully furnished residences at the tip of Palm Jumeirah, sold as a turnkey proposition rather than a shell to fit out.",
    about:
      "Palm View is pitched at buyers who want the address without the fit-out project: the residences are delivered fully furnished, in a range running from studios to four bedrooms, including a Sky Collection on the upper levels. The position at the tip of Palm Jumeirah puts Skydive Dubai, Dubai Marina, the Golf Club and Jumeirah Beach within a short drive, and the furnished spec makes it straightforward to place into short-let from day one.",
    highlights: [
      "Delivered fully furnished",
      "Sky Collection on the upper levels",
      "BBQ areas and resident amenity decks",
      "Tip of Palm Jumeirah",
    ],
    image: "/projects/palm-view-2.jpg",
    images: [
      "/projects/palm-view-2.jpg",
      "/projects/palm-view-1.jpg",
      "/projects/palm-view-5.jpg",
    ],
    source: "6WZ86VX9BmN1ZBjDSqdI3ZZtqg1zguUYKEotPPo3.pdf",
  },
  {
    slug: "north-43",
    name: "North 43 Serviced Residences",
    developer: "Naseeb Group",
    community: "Jumeirah Village Circle",
    unitMix: "Studio, 1, 2 and 3 bedroom serviced residences",
    blurb:
      "Serviced residences in JVC with hotel-style concierge and housekeeping, finished in Spanish porcelain throughout.",
    about:
      "North 43 is a serviced-residence building rather than a plain apartment block: concierge and housekeeping are part of the operating model, which is what makes it work as a short-let asset without an owner running it. Units run from studios to three bedrooms, finished in Spanish porcelain tile, with a swimming pool, gym and study spaces on the amenity floors. JVC sits between Al Khail and Sheikh Mohammed Bin Zayed Road, with the golf clubs and Palm a short drive west.",
    highlights: [
      "Concierge and housekeeping included",
      "Spanish porcelain tiling throughout",
      "Swimming pool, gym and study rooms",
      "Serviced model suits short-let ownership",
    ],
    image: "/projects/north-43-5.jpg",
    images: [
      "/projects/north-43-5.jpg",
      "/projects/north-43-1.jpg",
      "/projects/north-43-2.jpg",
      "/projects/north-43-3.jpg",
    ],
    source: "46a8a74b-4dd2-42ed-8a99-fb6a66ef1ad8.pdf",
  },
  {
    slug: "beverly-boulevard",
    name: "Beverly Boulevard",
    developer: "HMB Homes",
    community: "Arjan",
    unitMix: "Studios and 1–2 bedroom apartments",
    blurb:
      "A boutique-developer building in Arjan, next to the Miracle and Butterfly Gardens, pitched at calm rather than spectacle.",
    about:
      "HMB is a boutique UAE developer, and Beverly Boulevard is a smaller building than the tower launches around it — the pitch is balance and quiet rather than scale. Studios and one- to two-bedroom apartments sit above retail units, with a gym, sauna and steam, yoga studio, cinema, jogging track and kids' area on the amenity levels. Arjan is one of the cheaper freehold entries inside the Al Barsha South corridor, next to the Miracle and Butterfly Gardens.",
    highlights: [
      "Gym, sauna and steam rooms",
      "Yoga studio and private cinema",
      "Jogging track and kids' area",
      "Ground-floor retail units",
    ],
    image: "/projects/beverly-boulevard-1.jpg",
    images: [
      "/projects/beverly-boulevard-1.jpg",
      "/projects/beverly-boulevard-4.jpg",
      "/projects/beverly-boulevard-5.jpg",
      "/projects/beverly-boulevard-3.jpg",
    ],
    source: "313239f8-b1f8-4889-bb68-1025d3326139.pdf",
  },
  {
    slug: "couture-by-cavalli",
    name: "Couture by Cavalli",
    developer: "DAMAC",
    community: "Al Safa, Dubai Canal",
    unitMix: "Branded residences — mix on request",
    blurb:
      "A Cavalli-branded tower specified down to the material: travertine and Raggio Verde floors, champagne metal trim, fused bronze ceilings.",
    about:
      "A Cavalli-branded tower on the Dubai Canal at Al Safa, specified to a level most branded residences do not document publicly: travertine and Raggio Verde marble flooring, champagne metal partition trim, tinted translucent resin panels, fused bronze crinkle metal ceilings and satin repellent wallpaper to the feature columns. The material schedule is the product here as much as the floor plan.",
    highlights: [
      "Travertine marble and Raggio Verde flooring",
      "Champagne metal trim and bronze ceiling detail",
      "Textured resin cladding to columns",
      "Full Cavalli interior specification",
    ],
    image: "/projects/couture-by-cavalli-5.jpg",
    images: [
      "/projects/couture-by-cavalli-5.jpg",
      "/projects/couture-by-cavalli-2.jpg",
      "/projects/couture-by-cavalli-1.jpg",
      "/projects/couture-by-cavalli-4.jpg",
    ],
    source: "Couture By Cavalli Material Details.pdf",
  },
];

export const DEVELOPERS = [...new Set(PROJECTS.map((p) => p.developer))].sort();
