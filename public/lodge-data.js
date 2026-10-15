/* ==========================================================================
   LINDANI FARM: SITE DATA
   This is the only file the owner needs to edit. Everything the booking
   concierge, availability checker, rates table, book-direct note and language
   switcher show comes from here.

   - Anything marked  PLACEHOLDER  is sample content. Replace it with the
     real detail, then delete the comment.
   - Dates are written YYYY-MM-DD. Money is in rand, whole numbers, no "R".
   - Keep the commas and quote marks as they are. If the page stops working
     after an edit, a missing comma or quote is the usual cause.
   ========================================================================== */
window.LODGE = {

  name: "Lindani Farm",
  // Shown as a small notice in the concierge while sample data is in use.
  // Set to false once every PLACEHOLDER below has been replaced.
  showDemoNotice: false,               // rates and availability are real now (NightsBridge)

  contact: {
    phoneDisplay: "083 291 6790",          // from the farm's Instagram
    phoneInternational: "+27832916790",
    whatsapp: "27832916790",               // country code + number, no + or spaces
    email: "michelle.woest@gmail.com",     // confirmed: the address in the farm's booking policy (Oct 2026)
    area: "Just outside Paarl, Western Cape",
    address: "Lindani Plaas, Klein-Drakenstein, Paarl",  // from the farm's guest guide
    mapsLink: ""                           // PLACEHOLDER: paste a Google Maps link to the gate
  },

  currency: { code: "ZAR", locale: "en-ZA" },

  booking: {
    // Booking policy (Oct 2026): the 2-night minimum applies when the stay includes a Friday or Saturday night.
    minNights: 2,
    minNightsWeekendOnly: true,
    maxNights: 30,
    checkIn: "14:00",                      // NightsBridge: check-in 14:00–17:00, later by arrangement
    latestArrival: "17:00",            // (the guest guide's policy page says 20:00: confirm with the farm)
    checkOut: "10:00",
    depositPercent: 50,                    // within 24 hours of booking; balance 7 days before check-in
    depositDueHours: 24,
    balanceDueDays: 7,                     // also: stays less than 7 days away are paid in full
    // Book-direct note: online travel agents charge the lodge a commission,
    // so their price for the same stay is usually set higher. The saving shown
    // = direct price ÷ (1 − commission) − direct price.
    otaName: "Booking.com",
    // Set to their real Booking.com commission (e.g. 15) to show "Book direct and save…" notes.
    // 0 hides every saving note: we don't know their Booking.com prices yet.
    otaCommissionPercent: 0,               // PLACEHOLDER
    // The farm's full booking policy (flip-book) and the guest guide every guest
    // gets once a stay is booked. Shown on the Book page, in the FAQ answers,
    // the concierge and the "request sent" step.
    policyUrl: "policy.html",            // the Booking Policy page on this site
    // Lindani's NightsBridge booking page. Once set, every "Book your stay" button goes
    // straight to NightsBridge (live availability, no double bookings). Leave "" to keep
    // booking requests by WhatsApp/email.
    nightsbridgeUrl: "https://book.nightsbridge.com/40392",
    onboardingUrl: "https://lindani-vineyard-stay.base44.app/welcome",
    // Booking requests are saved to the bookings dashboard (/admin) on the live site.
    // Set to false to go back to WhatsApp/email hand-off only.
    liveRequests: false,                   // demo phase: requests go to the farm on WhatsApp/email. Set true once the dashboard is in use.
    // Added to the confirmation message the dashboard writes for the guest.
    depositInstructions: "We'll send your invoice with our banking details. Please pay by EFT with the invoice number as the reference, and send the proof of payment on WhatsApp or by email."
  },

  // Nightly rates per unit, copied from Lindani's NightsBridge calendar (book.nightsbridge.com/40392,
  // checked 15 Oct 2026). Outside these dates each unit's "rate" applies (R1,400).
  // "from"/"to" are YYYY-MM-DD and inclusive; leave "to" empty for "from this date on".
  // When the farm changes a rate in NightsBridge, change it here too.
  seasons: [
    { name: "Festive season", from: "2026-12-01", to: "2027-01-17", rate: 1800 },
    { name: "Easter",         from: "2027-03-25", to: "2027-04-05", rate: 1800 },
    { name: "2027 rate",      from: "2027-04-06", to: "", rate: 1500 }
  ],

  // The four self-catering units (Room 1–4 in the guest guide): queen bed, kitchenette,
  // en-suite, air-conditioning, Wi-Fi and TV. Rooms interlink in pairs (1+2, 3+4).
  // Blurbs are PLACEHOLDERS until the farm describes each room.
  rooms: [
    { id: "studio-1", photo: "studio-bed", name: "Studio One",   maxAdults: 2, sleeps: 2, rate: 1400, bed: "Queen bed",
      blurb: "Opens into Studio Two to make a family unit for four.", placeholder: true },
    { id: "studio-2", photo: "studio-kitchen", name: "Studio Two",   maxAdults: 2, sleeps: 2, rate: 1400, bed: "Queen bed",
      blurb: "Opens into Studio One to make a family unit for four.", placeholder: true },
    { id: "studio-3", photo: "studio-patio", name: "Studio Three", maxAdults: 2, sleeps: 2, rate: 1400, bed: "Queen bed",
      blurb: "Opens into Studio Four to make a family unit for four.", placeholder: true },
    { id: "studio-4", photo: "cottages", name: "Studio Four",  maxAdults: 2, sleeps: 2, rate: 1400, bed: "Queen bed",
      blurb: "Opens into Studio Three to make a family unit for four.", placeholder: true }
  ],
  // From the guest guide's amenities page.
  amenities: ["Queen bed with quality linen and an electric blanket", "Kitchenette with stove, microwave, fridge, toaster and air fryer", "En-suite shower, towels and hairdryer",
              "Air-conditioning, a safe and cleaning service", "Free Wi-Fi, TV with Netflix and Prime Video", "Pool, braai area and secure parking"],

  // Mock availability calendar. Each entry blocks a studio from "from" (check-in)
  // up to but not including "to" (check-out). PLACEHOLDER: replace with real bookings,
  // or later connect a live calendar (see README).
  booked: [
    { room: "studio-1", from: "2026-10-16", to: "2026-10-19" },
    { room: "studio-2", from: "2026-10-16", to: "2026-10-18" },
    { room: "studio-3", from: "2026-10-23", to: "2026-10-26" },
    { room: "studio-4", from: "2026-10-30", to: "2026-11-02" },
    { room: "studio-1", from: "2026-11-13", to: "2026-11-16" },
    { room: "studio-2", from: "2026-11-13", to: "2026-11-16" },
    { room: "studio-3", from: "2026-11-13", to: "2026-11-16" },
    { room: "studio-4", from: "2026-11-27", to: "2026-11-30" },
    { room: "studio-1", from: "2026-12-18", to: "2027-01-03" },
    { room: "studio-2", from: "2026-12-20", to: "2027-01-02" },
    { room: "studio-3", from: "2026-12-24", to: "2026-12-28" },
    { room: "studio-4", from: "2026-12-26", to: "2027-01-05" },
    { room: "studio-3", from: "2027-02-12", to: "2027-02-15" }
  ],

  // House rules shown on the Studios and Book pages. From the farm's guest guide (Oct 2026).
  houseRules: ["Maximum two people per unit", "Quiet time after 22:00",
               "No visitors: only registered guests on the property, and no parties or events in the units",
               "Braai in the braai area only (firewood provided), and douse the coals afterwards",
               "No swimming in the dam. The pool is open sunrise to sunset, with no lifeguard: supervise children at all times",
               "There are dogs on the farm, near the pool. Please don't feed them",
               "Please conserve water: this is the Western Cape",
               "At check-out, leave the keys in the unit and switch off the lights, aircon and TV"],

  // Nearby places for the Explore page. Drive times from the farm's guest guide (approximate).
  // type: wine | nature | family | daytrip | venue | school   (used by the filter buttons)
  places: [
    { name: "Avondale", type: "wine", drive: "10 min", blurb: "Organic wine estate with an eco-safari and Faber restaurant." },
    { name: "Klein Parys Vineyards", type: "wine", drive: "13 min", blurb: "Wine tasting and a relaxed estate on the edge of Paarl." },
    { name: "Nederburg", type: "wine", drive: "14 min", blurb: "One of the Cape's best-known wine estates, on the Paarl side of the valley." },
    { name: "Vendôme", type: "venue", drive: "15 min", blurb: "Historic wine estate and wedding venue on the Berg River." },
    { name: "Laborie", type: "venue", drive: "15 min", blurb: "A historic Paarl estate among the vines, with a restaurant, wedding venue and the Paarl Trails." },
    { name: "Spice Route", type: "wine", drive: "20 min", blurb: "Wine, craft beer, chocolate and good food on one hilltop estate." },
    { name: "Rhebokskloof", type: "venue", drive: "25 min", blurb: "Lakeside lawns and mountain views, one of the best-known wedding venues near Paarl." },
    { name: "Paarl Main Street", type: "family", drive: "14 min", blurb: "Shops and restaurants along the town's oak-lined main road." },
    { name: "Du Toitskloof Pass viewpoint", type: "nature", drive: "17 min", blurb: "Big views back over the Paarl valley from the pass above the farm." },
    { name: "Du Toitskloof hiking trails", type: "nature", drive: "20 min", blurb: "Mountain trails from the Kromrivier and Elandsrivier trailheads." },
    { name: "Paarl Rock and Paarl Mountain", type: "nature", drive: "20 min", blurb: "The granite domes of the Paarl Mountain Nature Reserve, with walks through fynbos." },
    { name: "Playrock Adventure Park", type: "family", drive: "15 min", blurb: "Outdoor adventure park for children on the Wemmershoek road." },
    { name: "Drakenstein Lion Park", type: "family", drive: "25 min", blurb: "A sanctuary for rescued lions that can't return to the wild." },
    { name: "Boschenmeer Golf Estate", type: "daytrip", drive: "15 min", blurb: "Eighteen holes in Paarl with mountain views." },
    { name: "Franschhoek", type: "daytrip", drive: "30 min", blurb: "The valley of restaurants and wine farms, an easy drive over the hill." },
    { name: "Akademia (Paarl campus)", type: "school", drive: "13 min", blurb: "A quiet base for parents visiting students in Paarl." },
    { name: "La Rochelle Girls' High", type: "school", drive: "14 min", blurb: "Close enough for sports days, concerts and long weekends." },
    { name: "Paarl Boys' High", type: "school", drive: "14 min", blurb: "Close enough for derby days, sports and school events." },
    { name: "Boland College", type: "school", drive: "16 min", blurb: "An easy drive into Paarl." },
    { name: "Green School South Africa", type: "school", drive: "16 min", blurb: "In the valley, near Paarl." },
    { name: "Paarl Gymnasium", type: "school", drive: "19 min", blurb: "Across town in Paarl." },
    { name: "Stellenbosch University", type: "school", drive: "30 min", blurb: "Half an hour away, for visits to students in Stellenbosch." }
  ],

  // Drive times for the Contact page (guest guide, approximate).
  distances: [
    { to: "Paarl Main Street", time: "about 14 min" },
    { to: "Akademia and Paarl schools", time: "13–19 min" },
    { to: "Stellenbosch University", time: "about 30 min" },
    { to: "Franschhoek", time: "about 30 min" },
    { to: "Cape Town", time: "about 1 hour" }
  ],

  // Questions for the FAQ lists on the Book and Contact pages. From the farm's booking policy and guest guide.
  faqs: [
    { q: "How do I book?", a: "On NightsBridge, our booking calendar: tap any \"Book\" button on this site, choose your dates and units, and book instantly. Questions first? WhatsApp us on 083 291 6790." },
    { q: "How do I pay?", a: "By EFT. Pay a 50% deposit within 24 hours of booking and the balance 7 days before check-in, or pay in full upfront. If your stay is less than 7 days away, full payment confirms it. Use your invoice number as the reference and send the proof of payment on WhatsApp or by email.", link: "policyUrl" },
    { q: "What if I need to cancel?", a: "Cancellations must be in writing to michelle.woest@gmail.com. 30 days or more before arrival, nothing is forfeited; 21 days before, 25%; 14 days before, 50%; 7 days before, 100%. No-shows and early departures aren't refunded. Refunds are paid within 7–10 business days.", link: "policyUrl" },
    { q: "Can I change my dates?", a: "Yes, up to 30 days before check-in, subject to availability. If the new dates have different rates, the difference is charged or refunded." },
    { q: "What time is check-in and check-out?", a: "Check-in is from 14:00 to 17:00. Arriving later? Let us know in advance so we can arrange it (a fee may apply). Check-out is by 10:00. Early check-in and late check-out depend on bookings: ask us on the day." },
    { q: "How does check-in work?", a: "It's self check-in. Once your stay is paid in full, we send your access code, parking details and directions on WhatsApp the day before you arrive. Park in the marked bays at the stone feature wall and walk down the stairs to the units.", link: "onboardingUrl" },
    { q: "Is there a minimum stay?", a: "Two nights for stays that include a Friday or Saturday night. Shorter stays may be possible on other dates: just ask." },
    { q: "Are meals included?", a: "Lindani is self-catering. Every unit has a kitchenette with a stove, microwave, fridge, toaster, air fryer, and tea and coffee, and there's a braai area with firewood provided." },
    { q: "Can a family stay together?", a: "Yes. The units interlink in pairs (One with Two, Three with Four). Book both units of a pair and open the connecting door: a family of four gets two bedrooms, two bathrooms and two kitchenettes under one roof." },
    { q: "Can we bring children?", a: "Yes. Each unit sleeps two (children pay the same rate as adults), and the units interlink in pairs to make a family unit for four. There's no lifeguard at the pool: children under 12 may not swim unaccompanied." },
    { q: "Can we bring our dog?", a: "Sorry, pets aren't allowed. The farm has its own dogs, horses, geese and chickens." },
    { q: "Can we swim in the dam?", a: "No, please don't swim in the dam, but you're welcome to walk down to the water. The pool is open from sunrise to sunset." },
    { q: "Is there Wi-Fi and air-conditioning?", a: "Yes: free Wi-Fi, air-conditioning and a TV with Netflix and Prime Video in every unit, plus secure parking inside the farm gates." },
    { q: "Can we book the whole farm?", a: "Yes. All four units together sleep eight, which suits families, friends and wedding guests. Parties and events in the units aren't allowed." }
  ],

  // Photos for the gallery on The farm page (file names in assets/, without .webp).
  gallery: [
    { src: "avenue", alt: "Tree-lined road into the farm with the mountain behind" },
    { src: "pool", alt: "Swimming pool under a large old tree" },
    { src: "dam", alt: "A guest at the farm dam in golden light" },
    { src: "braai", alt: "Garden seating with a built-in brick braai" },
    { src: "cottages", alt: "The studios with lit patios opening onto the lawn" },
    { src: "golden", alt: "Golden hour over the valley and mountains" },
    { src: "sunset", alt: "Sunset behind the mountains over the vineyards" },
    { src: "studio-bed", alt: "Studio bedroom with white linen" },
    { src: "studio-kitchen", alt: "Studio kitchenette, desk and en-suite bathroom" },
    { src: "studio-patio", alt: "Patio doors open to the trees at sunset" }
  ],

  meals: "Lindani is self-catering: every unit has a kitchenette (stove, microwave, fridge, toaster, air fryer, tea and coffee), and there's a braai area with firewood provided. " +
         "Paarl's shops and restaurants on Main Street are about 15 minutes away.",

  directions: "Lindani sits right on the N1 at the foot of Du Toitskloof Pass in Klein-Drakenstein, on the edge of Paarl: about an hour from Cape Town. " +
               "The day before you arrive we send your access code, parking details and directions on WhatsApp. Park in the marked bays at the stone feature wall and walk down the stairs to the units.",

  // From the farm's booking policy (Oct 2026).
  policies: {
    kids:   "Children are welcome. Each unit sleeps two, and the units interlink in pairs to make a family unit for four. There's no lifeguard: children under 12 may not swim unaccompanied.",
    pets:   "Sorry, pets aren't allowed. The farm has its own dogs, horses, geese and chickens.",
    smoking:"No smoking inside or outside the units, including the stoep. Please use the designated smoking area.",
    cancellation: "Cancellations must be in writing. 30+ days before arrival: full refund. 21 days: 25% forfeited. 14 days: 50%. 7 days: 100%. No refund for no-shows or early departures.",
    payment: "Pay a 50% deposit within 24 hours of booking and the balance 7 days before check-in, or pay in full. Stays less than 7 days away are paid in full. Payment is by EFT."
  },

  // Concierge knowledge base. The concierge picks the entry whose keywords best
  // match the guest's message (it also tolerates small typos). "answer" text can
  // use {phone}, {checkIn}, {checkOut}, {minNights}, {area}. Entries with "action"
  // run a built-in feature instead of (or after) the text.
  concierge: {
    hostName: "Lindani",
    intents: [
      { id: "greet", keywords: ["hi", "hello", "hey", "howzit", "good morning", "good afternoon", "hallo", "goeie"],
        answer: "Hello! Lovely to hear from you. What can I help you with: rooms, dates, things to do, or getting here?" },
      { id: "rooms", keywords: ["room", "rooms", "studio", "studios", "rate", "rates", "price", "prices", "cost", "how much", "accommodation", "unit", "sleep", "bed"],
        action: "rooms",
        answer: "We have four private self-catering units, each with a queen bed, a kitchenette, an en-suite shower, air-conditioning and Wi-Fi. They interlink in pairs, so a family of up to four can open the connecting door and stay together. Rates are R1,400 a night per unit (R1,800 over the festive season and Easter):" },
      { id: "dates", keywords: ["available", "availability", "dates", "date", "free", "vacancy", "check dates", "weekend", "night", "nights"],
        action: "dates",
        answer: "Our live calendar is on NightsBridge: it shows which units are free for your dates, and you can book there instantly." },
      { id: "book", keywords: ["book", "booking", "reserve", "reservation", "stay", "request"],
        action: "book",
        answer: "Wonderful! Bookings are made on NightsBridge: choose your dates, pick one unit (or two interlinking units for a family) and book instantly." },
      { id: "activities", keywords: ["activities", "activity", "things to do", "game drive", "safari", "birding", "birds", "bird", "birdwatching", "wildlife", "animals", "lions", "wine", "tasting", "hike", "hiking", "market", "pool", "dam", "swim", "kids activities"],
        action: "activities",
        answer: "There's plenty to fill (or not fill) your days. On the farm: the pool under the old trees, walks through the vineyards, lemon and olive trees, the dam for sundowners (no swimming), the horses and geese, and braai nights. Nearby: Avondale, Nederburg, Laborie, the Paarl Trails, Du Toitskloof Pass, Drakenstein Lion Park and Franschhoek." },
      { id: "directions", keywords: ["where", "directions", "location", "address", "get there", "getting here", "airport", "drive", "map", "how far", "distance", "cape town", "paarl"],
        action: "directions" },
      { id: "kids", keywords: ["kids", "children", "child", "baby", "family", "toddler"],
        answer: "{kids}" },
      { id: "pets", keywords: ["pet", "pets", "dog", "dogs", "cat"],
        answer: "{pets}" },
      { id: "kidspets", keywords: ["kids and pets", "kids & pets"],
        answer: "{kids}\n\n{pets}" },
      { id: "meals", keywords: ["food", "meal", "meals", "breakfast", "dinner", "restaurant", "kitchen", "cook", "self catering", "braai"],
        answer: "{meals}" },
      { id: "times", keywords: ["check in", "check out", "checkin", "checkout", "what time", "arrive", "arrival", "late", "early"],
        answer: "Check-in is from {checkIn} to 17:00 (later only by arrangement) and check-out is by {checkOut}. It's self check-in: we send your access code on WhatsApp the day before you arrive. Stays that include a Friday or Saturday night are at least {minNights} nights." },
      { id: "policies", keywords: ["cancel", "cancellation", "refund", "deposit", "pay", "payment", "smoking", "smoke", "policy", "rules"],
        answer: "{cancellation}\n\n{payment}\n\n{smoking}\n\nRead the [full booking policy]({policyUrl})." },
      { id: "wifi", keywords: ["wifi", "wi-fi", "internet", "signal", "loadshedding", "load shedding", "power", "aircon", "air conditioning", "parking"],
        answer: "Every unit has free Wi-Fi, air-conditioning and a TV with Netflix and Prime Video. Secure parking is inside the farm gates. For load-shedding, the farm is in Drakenstein Municipality (Paarl, block 9)." },
      { id: "schools", keywords: ["school", "schools", "akademia", "boland", "gymnasium", "paarl boys", "la rochelle", "university", "stellenbosch", "college", "student"],
        answer: "Lindani is handy for parents visiting Paarl schools: Akademia and La Rochelle Girls' High are about 13–14 minutes away, Paarl Boys' High 14, Boland College 16, Paarl Gymnasium 19 and Stellenbosch University about 30." },
      { id: "wedding", keywords: ["wedding", "venue", "event", "celebration", "anniversary", "honeymoon", "birthday"],
        answer: "Lovely! Many Winelands wedding venues are close by, so Lindani is an easy, quiet base for guests. Celebrating something? Mention it in the notes when you book, or WhatsApp us, and we'll help make it special." },
      { id: "contact", keywords: ["contact", "phone", "call", "whatsapp", "email", "talk", "human", "person", "owner"],
        action: "contact",
        answer: "You can reach the farm directly on {phone} (call or WhatsApp)." },
      { id: "thanks", keywords: ["thanks", "thank you", "dankie", "danke", "bedankt", "cheers", "great", "perfect"],
        answer: "Pleasure! Anything else I can help with?" }
    ],
    fallback: "I'm not quite sure about that one. Could you try one of these, or ask the farm directly on WhatsApp?"
  },

  /* ------------------------------------------------------------------------
     TRANSLATIONS for the language switcher. Covers headings, buttons and the
     concierge greeting. The concierge's detailed answers stay in English.
     German, Dutch and Afrikaans text should be checked by a native speaker.
     Text with <em> or <br> keeps the site's italic accent and line breaks.
     ------------------------------------------------------------------------ */
  i18n: {
    en: {
      nav_explore: "Explore", nav_book: "Book", page_studios: "Four studios, <em>one quiet farm</em>", page_farm: "Life on <em>the farm</em>", page_explore: "Taste, explore and <em>wander nearby</em>", page_book: "Book <em>your stay</em>", page_contact: "Find us, <em>talk to us</em>", avail_title: "Availability <em>at a glance</em>",
      language: "Language", nav_farm: "The farm", nav_studios: "Studios", nav_nearby: "Nearby", nav_onfarm: "On the farm", nav_contact: "Contact", nav_policy: "Booking policy",
      book: "Book your stay", hero_sub: "Four private self-catering units just outside Paarl, interlinking in pairs so families can stay together.", hero_label: "( Paarl · Cape Winelands )", hero_title: "Leave the city <em>at the gate.</em>",
      quick_title: "Plan your <em>stay here</em>", check_dates: "Check dates", exp_title: "A farm stay <br><em>made for slowing down</em>",
      meet_studios: "Meet the studios", studios_title: "Come home to <br><em>your own studio</em>", rates_title: "Studios &amp; <em>rates</em>",
      nearby_title: "Taste, explore <br>and <em>wander nearby</em>",
      band_title: "Golden hours, pool days <em>and braai nights</em>", see_farm: "See the farm", farm_title: "Days <em>on the farm</em>",
      enq_title: "Your farm escape <em>starts here</em>", send_enquiry: "Send enquiry",
      chat_open: "Ask Lindani", chat_title: "Lindani concierge",
      chat_greeting: "Hello and welcome to Lindani Farm! I'm the farm's booking helper. Ask me about the studios, rates, things to do or getting here, or tap an option below.",
      chat_placeholder: "Type your question…", chat_send: "Send", chat_close: "Close chat",
      qr_rooms: "Rooms & rates", qr_activities: "Activities", qr_dates: "Check dates", qr_directions: "Getting here", qr_kids: "Kids & pets", qr_book: "Book a stay",
      nudge: "Book direct and save about {amount} compared with {ota}."
    },
    de: {
      nav_explore: "Entdecken", nav_book: "Buchen", page_studios: "Vier Studios, <em>eine ruhige Farm</em>", page_farm: "Das Leben <em>auf der Farm</em>", page_explore: "Genießen, entdecken und <em>die Umgebung erkunden</em>", page_book: "Buchen Sie <em>Ihren Aufenthalt</em>", page_contact: "Finden Sie uns, <em>sprechen Sie mit uns</em>", avail_title: "Verfügbarkeit <em>auf einen Blick</em>",
      language: "Sprache", nav_farm: "Die Farm", nav_studios: "Studios", nav_nearby: "Umgebung", nav_onfarm: "Auf der Farm", nav_contact: "Kontakt", nav_policy: "Buchungsrichtlinie",
      book: "Aufenthalt buchen", hero_sub: "Vier private Studios für Selbstversorger auf einer Farm direkt außerhalb von Paarl.", hero_label: "( Paarl · Cape Winelands )", hero_title: "Lassen Sie die Stadt <em>am Tor zurück.</em>",
      quick_title: "Planen Sie <em>Ihren Aufenthalt</em>", check_dates: "Termine prüfen", exp_title: "Ein Farmaufenthalt, <br><em>um zur Ruhe zu kommen</em>",
      meet_studios: "Die Studios ansehen", studios_title: "Willkommen in <br><em>Ihrem eigenen Studio</em>", rates_title: "Studios &amp; <em>Preise</em>",
      nearby_title: "Genießen, entdecken <br>und <em>die Umgebung erkunden</em>",
      band_title: "Goldene Stunden, Pooltage <em>und Braai-Abende</em>", see_farm: "Die Farm ansehen", farm_title: "Tage <em>auf der Farm</em>",
      enq_title: "Ihre Auszeit auf der Farm <em>beginnt hier</em>", send_enquiry: "Anfrage senden",
      chat_open: "Fragen Sie Lindani", chat_title: "Lindani-Concierge",
      chat_greeting: "Hallo und willkommen auf der Lindani Farm! Ich helfe Ihnen bei der Buchung. Fragen Sie mich nach Studios, Preisen, Ausflügen oder der Anreise, oder wählen Sie unten eine Option. (Ausführliche Antworten vorerst auf Englisch.)",
      chat_placeholder: "Ihre Frage …", chat_send: "Senden", chat_close: "Chat schließen",
      qr_rooms: "Zimmer & Preise", qr_activities: "Aktivitäten", qr_dates: "Termine prüfen", qr_directions: "Anreise", qr_kids: "Kinder & Haustiere", qr_book: "Aufenthalt buchen",
      nudge: "Direkt buchen und gegenüber {ota} etwa {amount} sparen."
    },
    nl: {
      nav_explore: "Ontdekken", nav_book: "Boeken", page_studios: "Vier studio's, <em>één rustige boerderij</em>", page_farm: "Het leven <em>op de boerderij</em>", page_explore: "Proeven, ontdekken en <em>de omgeving verkennen</em>", page_book: "Boek <em>je verblijf</em>", page_contact: "Vind ons, <em>praat met ons</em>", avail_title: "Beschikbaarheid <em>in één oogopslag</em>",
      language: "Taal", nav_farm: "De boerderij", nav_studios: "Studio's", nav_nearby: "In de buurt", nav_onfarm: "Op de boerderij", nav_contact: "Contact", nav_policy: "Boekingsbeleid",
      book: "Boek je verblijf", hero_sub: "Vier privéstudio's met eigen keuken op een boerderij net buiten Paarl.", hero_label: "( Paarl · Cape Winelands )", hero_title: "Laat de stad <em>achter bij het hek.</em>",
      quick_title: "Plan hier <em>je verblijf</em>", check_dates: "Data bekijken", exp_title: "Een boerderijverblijf <br><em>om tot rust te komen</em>",
      meet_studios: "Bekijk de studio's", studios_title: "Thuiskomen in <br><em>je eigen studio</em>", rates_title: "Studio's &amp; <em>prijzen</em>",
      nearby_title: "Proeven, ontdekken <br>en <em>de omgeving verkennen</em>",
      band_title: "Gouden uren, zwembaddagen <em>en braai-avonden</em>", see_farm: "Bekijk de boerderij", farm_title: "Dagen <em>op de boerderij</em>",
      enq_title: "Je ontsnapping naar de boerderij <em>begint hier</em>", send_enquiry: "Aanvraag versturen",
      chat_open: "Vraag het Lindani", chat_title: "Lindani-concierge",
      chat_greeting: "Hallo en welkom op Lindani Farm! Ik help je met boeken. Vraag me naar de studio's, prijzen, activiteiten of de route, of kies hieronder een optie. (Uitgebreide antwoorden voorlopig in het Engels.)",
      chat_placeholder: "Typ je vraag…", chat_send: "Verstuur", chat_close: "Chat sluiten",
      qr_rooms: "Kamers & prijzen", qr_activities: "Activiteiten", qr_dates: "Data bekijken", qr_directions: "Route", qr_kids: "Kinderen & huisdieren", qr_book: "Verblijf boeken",
      nudge: "Boek direct en bespaar ongeveer {amount} ten opzichte van {ota}."
    },
    af: {
      nav_explore: "Verken", nav_book: "Bespreek", page_studios: "Vier studio's, <em>een stil plaas</em>", page_farm: "Die lewe <em>op die plaas</em>", page_explore: "Proe, verken en <em>dwaal in die omgewing</em>", page_book: "Bespreek <em>jou verblyf</em>", page_contact: "Kry ons, <em>praat met ons</em>", avail_title: "Beskikbaarheid <em>in een oogopslag</em>",
      language: "Taal", nav_farm: "Die plaas", nav_studios: "Studio's", nav_nearby: "In die omgewing", nav_onfarm: "Op die plaas", nav_contact: "Kontak", nav_policy: "Besprekingsbeleid",
      book: "Bespreek jou verblyf", hero_sub: "Vier private selfsorg-studio's op 'n plaas net buite die Paarl.", hero_label: "( Paarl · Kaapse Wynland )", hero_title: "Los die stad <em>by die hek.</em>",
      quick_title: "Beplan <em>jou verblyf</em> hier", check_dates: "Kyk na datums", exp_title: "'n Plaasverblyf <br><em>om stadiger te leef</em>",
      meet_studios: "Sien die studio's", studios_title: "Kom tuis in <br><em>jou eie studio</em>", rates_title: "Studio's &amp; <em>tariewe</em>",
      nearby_title: "Proe, verken <br>en <em>dwaal in die omgewing</em>",
      band_title: "Goue ure, swembaddae <em>en braai-aande</em>", see_farm: "Sien die plaas", farm_title: "Dae <em>op die plaas</em>",
      enq_title: "Jou plaasontvlugting <em>begin hier</em>", send_enquiry: "Stuur navraag",
      chat_open: "Vra vir Lindani", chat_title: "Lindani-gasheer",
      chat_greeting: "Hallo en welkom by Lindani Farm! Ek help jou om te bespreek. Vra my oor die studio's, tariewe, aktiwiteite of die roete hierheen, of kies 'n opsie hieronder. (Volledige antwoorde voorlopig in Engels.)",
      chat_placeholder: "Tik jou vraag…", chat_send: "Stuur", chat_close: "Maak klets toe",
      qr_rooms: "Kamers & tariewe", qr_activities: "Aktiwiteite", qr_dates: "Kyk na datums", qr_directions: "Roete hierheen", qr_kids: "Kinders & troeteldiere", qr_book: "Bespreek 'n verblyf",
      nudge: "Bespreek direk en spaar sowat {amount} teenoor {ota}."
    }
  }
};
