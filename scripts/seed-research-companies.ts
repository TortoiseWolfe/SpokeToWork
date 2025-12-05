/**
 * Seed companies from Cleveland, TN Technology Services Business Directory
 * Run with: docker compose exec spoketowork npx tsx scripts/seed-research-companies.ts
 *
 * Uses Management API to bypass RLS
 */

const PROJECT_REF = 'utxdunkaropkwnrqrsef';
const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  'sbp_5ae9c1d7aee0ae94602c3054915e699a4eb8941b';
const USER_ID = '05ef57ea-65a8-4694-aff6-2d8ece3dd8e5';

interface ResearchCompany {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  contact_name?: string;
  contact_title?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

// ZONE 1: 0-5 MILES - Prime Biking Distance
const zone1Companies: ResearchCompany[] = [
  // MANUFACTURING & INDUSTRIAL
  {
    name: 'Eaton Electrical - Cleveland Division',
    address: '3990 Old Tasso Rd NE, Cleveland, TN 37312',
    phone: '(423) 472-3305',
    website: 'www.eaton.com',
    priority: 1,
    notes:
      'Industry 4.0 Lighthouse Factory (first fully digital in North America, 2024). 290-450+ employees. Advanced technologies: Additive manufacturing, simulation, robotic automation, AMRs, IIoT, AR. Budget potential: $100K-$500K+',
  },
  {
    name: 'Jackson Furniture Industries',
    address: '180 Industrial Ln SE, Cleveland, TN 37311',
    phone: '(423) 476-8544',
    email: 'customerservice@jacksonfurniture.com',
    website: 'www.gojfi.com',
    priority: 3,
    notes:
      '894-1,090 employees. Upholstered furniture. Tech Stack: Vue.js, Axios, Laravel, Microsoft Excel, Google Analytics. Modernize 10-factory coordination systems. Budget potential: $50K-$150K',
  },
  {
    name: 'Manufacturers Chemicals LLC',
    address: '4325 Old Tasso Rd NE, Cleveland, TN 37312',
    phone: '(423) 476-6666',
    priority: 5,
    notes:
      'Process automation, chemical inventory tracking systems opportunity.',
  },
  {
    name: 'Cormetech Inc.',
    address: '3300 Old Tasso Rd NE, Cleveland, TN 37312',
    phone: '(423) 473-6900',
    priority: 5,
    notes: 'Manufacturing automation, quality control systems opportunity.',
  },
  {
    name: 'A Plus Pallet Co.',
    address: '3379 Old Tasso Rd NE, Cleveland, TN 37312',
    phone: '(423) 478-2663',
    priority: 5,
    notes: 'Inventory management, production tracking opportunity.',
  },
  {
    name: 'ADM Milling',
    address: '430 Central Ave NE, Cleveland, TN 37312',
    phone: '(423) 476-7551',
    priority: 5,
    notes: 'Food processing automation, inventory systems opportunity.',
  },
  {
    name: 'Duracell Manufacturing',
    address: '501 Mouse Creek Rd NW, Cleveland, TN 37312',
    phone: '(423) 476-7503',
    priority: 3,
    notes:
      '450+ employees. $25M expansion (2023). C & D alkaline batteries. Production automation, multi-site coordination, quality control. Budget potential: $75K-$200K',
  },
  {
    name: 'Beiersdorf/Formulated Solutions Cleveland',
    address: 'Michigan Avenue, Cleveland, TN 37311',
    phone: '',
    contact_name: 'Victor Swint',
    contact_title: 'President/CEO',
    priority: 2,
    notes:
      '524 planned employees. $43.6M facility upgrade. Pharmaceuticals, aerosols, medical devices. FDA-compliant MES systems, batch tracking, quality control. Restarting 2024-2025 (greenfield IT opportunity). Budget potential: $100K-$300K',
  },
  {
    name: 'Mueller Company',
    address: '620 Industrial Dr SW, Cleveland, TN 37311',
    phone: '(423) 339-3982',
    priority: 5,
    notes: 'Manufacturing software, inventory management opportunity.',
  },
  {
    name: 'Starplex Scientific Corp',
    address: '705 Industrial Dr SW, Cleveland, TN 37311',
    phone: '(423) 479-4108',
    priority: 5,
    notes:
      'Pharmaceutical plastics. Quality management systems, production tracking opportunity.',
  },
  {
    name: 'Polartec Tennessee Manufacturing',
    address: '310 Industrial Dr SW, Cleveland, TN 37311',
    phone: '(423) 476-9163',
    contact_name: 'Michael Mott',
    contact_title: 'IT Manager',
    priority: 3,
    notes:
      'IT Contact confirmed via LinkedIn. Manufacturing IT support, system upgrades. Budget potential: $30K-$100K',
  },
  {
    name: 'Southeastern Container Inc.',
    address: '555 Industrial Dr SW, Cleveland, TN 37311',
    phone: '(423) 728-3333',
    priority: 5,
    notes:
      'PET containers for Coca-Cola. Production automation, inventory management opportunity.',
  },
  {
    name: 'Fun Treats Inc.',
    address: '525 Industrial Dr SW, Cleveland, TN 37311',
    phone: '(423) 476-1302',
    priority: 5,
    notes: 'Food processing automation opportunity.',
  },
  {
    name: 'Lubing Systems LP',
    address: '135 Corporate Dr SW, Cleveland, TN 37311',
    phone: '(423) 709-1000',
    priority: 5,
    notes: '30-80 employees. ERP upgrade, production tracking opportunity.',
  },
  {
    name: 'Fowler Industrial Plating LLC',
    address: '1619 Lois St SE, Cleveland, TN 37311',
    phone: '(423) 813-7272',
    priority: 5,
    notes: 'Process control systems, quality tracking opportunity.',
  },
  // HEALTHCARE
  {
    name: 'Bradley Medical Center (Vitruvian Health)',
    address: '2305 Chambliss Avenue NW, Cleveland, TN 37311',
    phone: '(423) 559-6000',
    email: '[email protected]',
    website: 'vitruvianhealth.com',
    contact_name: 'Randall Foster',
    contact_title: 'Director Financial Services',
    priority: 1,
    notes:
      '351-bed regional hospital. 400+ providers. Recently migrated Cerner to Epic (Nov 2025). Hamilton Health acquisition (Aug 2024). Epic integration, custom healthcare apps, data migration, cybersecurity. Budget potential: $200K-$1M+',
  },
  {
    name: 'Bradley Walk-In Clinic - North',
    address: '1060 Peerless Crossing, 2nd Floor, Cleveland, TN 37312',
    phone: '(423) 380-6400',
    priority: 5,
    notes:
      'Parent: Vitruvian Health. Integration with main hospital systems opportunity.',
  },
  {
    name: 'Bradley Urgent Care',
    address: '4021 Keith Street NW, Cleveland, TN 37312',
    phone: '(423) 476-2464',
    email: 'info@bradleyurgentcare.com',
    website: 'bradleyurgentcare.com',
    priority: 5,
    notes:
      'Locally owned since 2008. Dr. Mahmood Siddiqui (Medical Director). Practice management software, patient portal, telehealth integration opportunity.',
  },
  {
    name: 'AFC Urgent Care Cleveland',
    address: '170 Mouse Creek Road, Cleveland, TN 37312',
    phone: '(423) 458-1426',
    website: 'afcurgentcare.com/cleveland-tn',
    priority: 5,
    notes: 'Urgent care EMR, patient flow software opportunity.',
  },
  {
    name: 'Bradley Healthcare & Rehabilitation Center',
    address: '2910 Peerless Road NW, Cleveland, TN 37312',
    phone: '(423) 472-7116',
    website: 'bradleyhealthcare.com',
    priority: 5,
    notes:
      'Skilled nursing facility (founded 1957). Long-term care software, compliance systems opportunity.',
  },
  // PROFESSIONAL SERVICES
  {
    name: 'HHM CPAs',
    address: '266 Inman Street E, Cleveland, TN 37311',
    phone: '(423) 708-3980',
    website: 'hhmcpas.com/cleveland',
    priority: 3,
    notes:
      "Chattanooga's largest accounting firm. Offices: Cleveland, Chattanooga (2), Memphis, Pensacola. Cloud accounting infrastructure, tax software upgrades, cybersecurity, client portals. Budget potential: $50K-$150K",
  },
  {
    name: 'Wedgewood Accounting, PLLC',
    address: '4395 North Ocoee Street, Cleveland, TN 37312',
    phone: '(423) 476-5581',
    website: 'wedgewoodaccounting.com',
    priority: 5,
    notes: 'Tax software, client portal, document management opportunity.',
  },
  {
    name: 'Chancey-Kanavos Law Firm',
    address: '121 Broad Street SW, Cleveland, TN 37311',
    phone: '(423) 479-9186',
    email: 'FRANKLIN@CKLPLAW.COM',
    website: 'cklplawfirm.com',
    priority: 5,
    notes:
      'Attorneys: Scott Kanavos, Paula Henderson. Case management systems, e-discovery, document automation opportunity.',
  },
  {
    name: 'Law Office of Jack W. Tapper',
    address: 'Old Tasso Road & Stuart Road, Cleveland, TN 37312',
    phone: '(423) 472-9512',
    website: 'jacktapper.com',
    contact_name: 'Jack W. Tapper',
    priority: 5,
    notes:
      '38+ years experience. Family law, estates, business, real estate. Document management, client portal, case management opportunity.',
  },
  // EDUCATION
  {
    name: 'Cleveland State Community College',
    address: '3535 Adkisson Drive NW, Cleveland, TN 37312',
    phone: '(423) 472-7141',
    email: 'clscc_info@clevelandstatecc.edu',
    website: 'clevelandstatecc.edu',
    priority: 2,
    notes:
      '3,200 credit students, 1,300 non-credit. 200+ employees, 70+ full-time faculty. 105 acres, 10 buildings. $25M Health and Science Center (2021). Dr. Andy White (President). LMS, student portals, campus network, cybersecurity. Budget potential: $100K-$500K',
  },
  // TECH COMPANIES
  {
    name: 'CorpTek',
    address: '244 1st St NE, Cleveland, TN 37311',
    phone: '(423) 321-2781',
    website: 'corptek.cc',
    contact_name: 'Jeremy Jarvis',
    contact_title: 'Founder/CEO',
    priority: 5,
    notes:
      'Founded 2000. ~$6M revenue. 11-50 employees. Managed IT, computer repair, networking, cloud backup, VoIP, cybersecurity. Potential competitor or partnership.',
  },
  {
    name: 'Webive Digital Marketing',
    address: '166 N Ocoee St, Cleveland, TN 37311',
    phone: '(423) 690-7273',
    email: 'anton@webive.com',
    website: 'webive.com',
    priority: 5,
    notes: 'AI-powered digital marketing. Potential partner for web projects.',
  },
  {
    name: 'Social Joey',
    address: '1025 Peerless Xing NW, Cleveland, TN 37312',
    priority: 5,
    notes: 'Social media marketing, PPC ads. Potential partner.',
  },
  // REAL ESTATE
  {
    name: 'Bender Realty, LLC',
    address: '425 25th St NW, Cleveland, TN 37311',
    phone: '(423) 472-2173',
    email: 'admin@bender-realty.com',
    website: 'bender-realty.com',
    contact_name: 'Brian Workman',
    contact_title: 'Broker/Owner',
    priority: 1,
    notes:
      'Founded 1969 (56 years). 50-100 employees. 500+ properties managed. Tech gaps: Outdated property management software, no tenant portal, manual maintenance requests, no mobile app. Complete property management system overhaul. Budget potential: $50K-$150K',
  },
  // HVAC & HOME SERVICES
  {
    name: 'Springdale Heating & Air',
    address: '3871 Old Tasso Rd NE, Cleveland, TN 37312',
    phone: '(423) 479-6363',
    website: 'springdaleair.com',
    priority: 3,
    notes:
      'Founded 1971 (54 years). 20-40 employees. License: TN #00057653. Tech gaps: Manual scheduling, no online booking, paper work orders. Field service management software, online booking, customer portal, mobile technician app. Budget potential: $20K-$75K',
  },
  {
    name: 'Platinum Heating & Air LLC',
    address: '4691 N Lee Highway, Cleveland, TN 37312',
    phone: '(423) 250-5050',
    priority: 5,
    notes:
      '10-20 employees. Service management software, online booking opportunity.',
  },
  {
    name: 'American Air HVAC, Inc.',
    address: '265 Broad Street SW, Cleveland, TN 37311',
    phone: '(423) 238-6848',
    priority: 5,
    notes:
      '10-25 employees. Complete digital transformation - website, scheduling, CRM opportunity.',
  },
  // CONSTRUCTION
  {
    name: 'Concord Homes',
    address: '852 Urbane Rd NE, Cleveland, TN 37312',
    phone: '(423) 373-2800',
    website: 'concord-home.com',
    priority: 5,
    notes:
      '20-50 employees. Custom homes, remodeling. 3D design visualization, client portal, project timeline tracking, lot inventory system. Budget potential: $30K-$100K',
  },
  {
    name: 'H.S. Williams Company Inc.',
    address: '4235 TL Rogers St NE, Cleveland, TN 37312',
    phone: '(423) 384-6355',
    priority: 5,
    notes: '20-50 employees. Website, project management software opportunity.',
  },
  {
    name: 'Alguire Construction',
    address: 'Cleveland, TN',
    website: 'alguireconcrete.com',
    priority: 5,
    notes:
      'Founded 1999. Concrete & masonry. Online estimator, project gallery, scheduling opportunity.',
  },
  // DISTRIBUTION
  {
    name: 'Advantage Logistics, Inc.',
    address: '304 Industrial Way SW, Cleveland, TN 37311',
    phone: '(888) 559-0771',
    priority: 5,
    notes:
      '25-60 employees. Regional truckload carrier. Load management software, GPS tracking, customer portal, automated quoting. Budget potential: $40K-$120K',
  },
  // RESTAURANTS & RETAIL DOWNTOWN
  {
    name: 'Cafe Roma',
    address: '220 North Ocoee Street, Cleveland, TN 37311',
    phone: '(423) 339-1488',
    website: 'caferomatn.com',
    priority: 5,
    notes:
      '15-30 employees. Online ordering, reservation system, loyalty program. Budget potential: $15K-$40K',
  },
  {
    name: 'Mash & Hops',
    address: '168 1st Street NE, Cleveland, TN 37311',
    phone: '(423) 667-9245',
    website: 'mashandhops.com',
    priority: 5,
    notes: 'Online ordering, event management, beer inventory opportunity.',
  },
  {
    name: 'First Bloom Coffee',
    address: '445 Church St SE, Cleveland, TN 37311',
    phone: '(423) 432-3082',
    priority: 5,
    notes:
      'Old Woolen Mill location. Mobile ordering app, loyalty program opportunity.',
  },
  {
    name: 'Prior Attire Consignment',
    address: '120 Inman St E, Cleveland, TN 37311',
    priority: 5,
    notes:
      '8-18 employees. Locations: Cleveland & Ooltewah. Multi-location inventory system, consignor portal, e-commerce platform. Budget potential: $25K-$60K',
  },
  {
    name: 'Ever After Bridal',
    address: '251 Inman St E, Cleveland, TN 37311',
    phone: '(423) 478-5493',
    priority: 5,
    notes:
      'Online appointments, virtual try-on, inventory management, CRM opportunity.',
  },
  {
    name: 'Trailhead Bicycle Co.',
    address: '225 1st St NE, Cleveland, TN 37311',
    phone: '(423) 472-9899',
    priority: 5,
    notes:
      'E-commerce for parts, service scheduling, inventory management opportunity.',
  },
  // GOVERNMENT
  {
    name: 'Bradley County Government',
    address: '155 N Ocoee Street, Suite 104, Cleveland, TN 37311',
    phone: '(423) 728-7121',
    email: 'gdavis@bradleycountytn.gov',
    website: 'bradleycountytn.gov',
    contact_name: 'D. Gary Davis',
    contact_title: 'County Mayor',
    priority: 2,
    notes:
      'Population served: 108,620. GIS mapping systems, 911 dispatch center, online services, election management. GIS upgrades, 911 system enhancements, public safety software, citizen services. Budget potential: $100K-$500K (RFP process)',
  },
];

// ZONE 2: 5-10 MILES - Moderate Biking Distance
const zone2Companies: ResearchCompany[] = [
  // MANUFACTURING & INDUSTRIAL
  {
    name: 'Derby Supply Chain Solutions',
    address: '3285 Davy Crockett Drive, Cleveland, TN 37323',
    phone: '(423) 614-6766',
    website: 'derbyllc.com',
    priority: 1,
    notes:
      '100-200 employees. 230,000+ sq ft. ISO 9001:2015, FDA Registered, AIB "Superior". 3PL warehousing, distribution, packaging. WMS upgrade, client portals, real-time inventory tracking, API integrations. Budget potential: $75K-$200K',
  },
  {
    name: 'Whirlpool Corporation - Cleveland Division',
    address: '2525 Benton Pike NE, Cleveland, TN 37323',
    phone: '(423) 472-3371',
    website: 'whirlpool.com',
    priority: 2,
    notes:
      '1,600+ employees (largest employer). Founded 1977. Premium cooking appliances (Whirlpool, Jenn-Air, KitchenAid, Maytag, Amana). Manufacturing automation consulting, MES systems, data analytics. Budget potential: $200K-$1M+',
  },
  {
    name: 'Mars Chocolate North America',
    address: '3500 Peerless Rd NW, Cleveland, TN 37312',
    phone: '(423) 479-8611',
    contact_name: 'Dustin Love',
    contact_title: 'Process Engineer (IT focus)',
    priority: 3,
    notes:
      "575+ employees. M&M's, Twix. Lean manufacturing, process engineering, data mining, reliability metrics. Production data analytics, continuous improvement software, quality control automation. Budget potential: $100K-$300K",
  },
  {
    name: 'Central Asphalt Inc.',
    address: '348 Ladd Springs Rd SE, Cleveland, TN 37323',
    phone: '(423) 614-7333',
    priority: 5,
    notes: 'Process control systems, inventory management opportunity.',
  },
  {
    name: 'Ecoat.US',
    address: '928 Minnis Rd NE, Cleveland, TN 37323',
    phone: '(844) 747-5747',
    priority: 5,
    notes: 'Process automation, quality tracking opportunity.',
  },
  {
    name: 'Tri-State Truss Co. LLC',
    address: '1198 51st St NE, Cleveland, TN 37311',
    phone: '(423) 472-3389',
    priority: 5,
    notes: 'Production management, inventory tracking opportunity.',
  },
  {
    name: 'Wind River Custom Homes',
    address: '970 Old Chattanooga Pike SW, Cleveland, TN 37311',
    phone: '(423) 650-2447',
    priority: 3,
    notes:
      '120 total planned (77 new jobs). $2.5M expansion (2024). 92,000 sq ft. Park model RVs, modular homes. Production management, design software, inventory systems. Budget potential: $40K-$150K',
  },
  // EDUCATION
  {
    name: 'Lee University',
    address: '1120 North Ocoee Street, Cleveland, TN 37311',
    phone: '(800) 533-9930',
    email: 'info@leeuniversity.edu',
    website: 'leeuniversity.edu',
    priority: 2,
    notes:
      'Private Christian University. 3,271 undergrad (Fall 2024). 120 acres, multiple locations. 13:1 student-faculty ratio. All undergrads study abroad. Enterprise systems (SIS, LMS, ERP), campus network, cybersecurity, cloud services. Budget potential: $100K-$500K',
  },
  // AUTO DEALERSHIPS
  {
    name: 'Toyota of Cleveland',
    address: '100 25th St NE, Cleveland, TN 37311',
    phone: '(423) 879-2972',
    website: 'toyotaofcleveland.com',
    priority: 3,
    notes:
      '40-80 employees. Tech gaps: Outdated inventory management, no virtual showroom, limited CRM, no online financing, manual service scheduling. Dealer management modernization, online service portal, inventory, CRM. Budget potential: $40K-$120K',
  },
  {
    name: 'Crown CDJR of Cleveland',
    address: '402 Inman St E, Cleveland, TN 37311',
    phone: '(423) 468-9655',
    website: 'crownchryslerdodgejeep.com',
    priority: 5,
    notes:
      '40-70 employees. E-commerce for parts, mobile app, CRM system, warranty automation opportunity.',
  },
  {
    name: 'Cleveland Ford (Larry Hill Ford)',
    address: '2496 S Lee Hwy, Cleveland, TN 37311',
    phone: '(423) 529-4793',
    priority: 5,
    notes:
      '60-100 employees. Service department software, online vehicle configurator, trade-in automation opportunity.',
  },
  // CONSTRUCTION
  {
    name: 'Cherokee Construction',
    address: '3054 Overlook Dr, Cleveland, TN 37312',
    phone: '(423) 472-1474',
    website: 'cherokeeconst.com',
    contact_name: 'Jim Williams',
    priority: 3,
    notes:
      '40-80 employees. 40+ years. Commercial, industrial, residential construction. Tech gaps: No project management software, manual bid tracking, no client portal, manual documents/timesheets. Complete project management suite. Budget potential: $50K-$150K',
  },
  // FINANCIAL SERVICES
  {
    name: 'Tennessee Valley Federal Credit Union',
    address: '2440 Treasury Dr, Cleveland, TN 37323',
    phone: '(423) 634-8200',
    priority: 3,
    notes:
      '50-100+ employees. Mobile app development, enhanced online services, digital transformation, member portal upgrades. Budget potential: $50K-$200K',
  },
  {
    name: 'Appliance Credit Union',
    address: '150 Linden Ave SE, Cleveland, TN 37311',
    phone: '(423) 479-5511',
    contact_name: 'Rhonda Brown',
    contact_title: 'President',
    priority: 5,
    notes:
      '20-50 employees. Website redesign, mobile app, loan automation opportunity.',
  },
  {
    name: 'Bradley/Polk Walk-in Clinic',
    address: 'Ocoee, TN (Bradley County)',
    website: 'bradleypolkwalkinclinic.com',
    priority: 5,
    notes: 'EMR integration, patient portal opportunity.',
  },
];

// ZONE 3: 10-20 MILES - Extended Range
const zone3Companies: ResearchCompany[] = [
  // MANUFACTURING & INDUSTRIAL
  {
    name: 'WACKER POLYSILICON North America',
    address: '553 Wacker Blvd, Charleston, TN 37310',
    phone: '+1 (423) 780-7950',
    website: 'wacker.com',
    contact_name: 'Tobias Brandis',
    contact_title: 'President',
    priority: 1,
    notes:
      "650-772 employees. $2.5 billion facility. Hyperpure polysilicon (semiconductors, photovoltaics, 5G, AI). State-of-the-art Siemens process control, IATF 16949 standards, cleanroom technology, energy management. World's 2nd largest polysilicon producer. Budget potential: $200K-$1M+",
  },
  {
    name: 'SK Food Group',
    address: '440 Innovation Dr SW, McDonald, TN 37353',
    phone: '(480) 254-4881',
    email: 'info@skfoodgroup.com',
    website: 'skfoodgroup.com',
    contact_name: 'Dustin Dixon',
    contact_title: 'President',
    priority: 1,
    notes:
      'GREENFIELD OPPORTUNITY. 840 planned by 2030. $205.2M investment. 525,000 sq ft (3 phases). Sandwiches, wraps, snacks (2M+ units/day). Phase 1 opening 2025. Complete IT infrastructure from ground up, automation, food safety compliance. Budget potential: $150K-$500K+',
  },
  {
    name: 'Amazon Fulfillment Center CHA2',
    address: 'Charleston, TN (Hiwassee River Industrial Park)',
    email: 'cha2-it@amazon.com',
    phone: '(206) 266-1000',
    priority: 5,
    notes:
      '790+ employees. Amazon Robotics, zero-emission PIT, warehouse automation, AWS cloud. DIRECT IT EMAIL. Integration services, custom automation consulting (typically uses internal teams, local support possible).',
  },
  {
    name: 'Olin Corporation - Charleston Chlor Alkali',
    address: '1186 Lower River Rd NW, Charleston, TN 37310',
    phone: '(423) 336-4000',
    website: 'olinchloralkali.com',
    priority: 3,
    notes:
      '357 employees. $160M membrane cell technology investment (2011-2012). Caustic soda, chlorine, hydrochloric acid, KOH. Process automation consulting, safety systems, environmental monitoring. Budget potential: $75K-$250K',
  },
  {
    name: 'Solenis',
    address: '1200 Old Lower River Rd NW, Charleston, TN 37310',
    phone: '(423) 780-2724',
    priority: 5,
    notes: 'Chemical process automation, inventory management opportunity.',
  },
  {
    name: 'Bradley Tank & Pipe LLC',
    address: '185 Boss Rd, McDonald, TN 37353',
    phone: '(423) 479-4482',
    priority: 5,
    notes: 'Manufacturing software, inventory systems opportunity.',
  },
  {
    name: 'Cleveland Cliffs',
    address: '121 Innovation Dr SW, McDonald, TN 37353',
    phone: '(423) 244-9088',
    priority: 5,
    notes:
      'Iron and steel (since 1847). Production management, quality control systems opportunity.',
  },
  {
    name: 'Amaero Advanced Materials',
    address: '130 Innovation Drive SW, McDonald, TN 37353',
    phone: '(423) 457-7503',
    priority: 5,
    notes:
      'Titanium alloy powder manufacturing. Advanced manufacturing software, quality control opportunity.',
  },
  {
    name: 'Woodway Inc.',
    address: '3473 No Pone Rd NW, Georgetown, TN 37336',
    phone: '(423) 336-5212',
    priority: 5,
    notes: 'Manufacturing automation opportunity.',
  },
  {
    name: 'DENSO Manufacturing Athens TN',
    address: '2400 Denso Dr, Athens, TN 37303',
    phone: '(423) 746-0000',
    priority: 5,
    notes:
      '1,375+ employees. Automotive components. Automotive manufacturing software, automation consulting opportunity.',
  },
  // PROFESSIONAL SERVICES
  {
    name: 'JHM Certified Public Accountants',
    address: 'Cleveland, TN (Chattanooga-based)',
    website: 'jhmcpa.com',
    priority: 3,
    notes:
      'Founded 1977. Regional firm (fast-growing). Specialization: Healthcare (HIPAA, Medicare/Medicaid, revenue cycle), real estate, construction, senior living. Healthcare IT consulting partnerships, cybersecurity, cloud, client portals. Budget potential: $50K-$200K',
  },
  {
    name: 'Miller Law Firm',
    address: 'Cleveland, TN',
    phone: '(423) 464-6852',
    website: 'millerlawfirmtn.com',
    contact_name: 'Jeff Miller',
    priority: 5,
    notes:
      'Founded 1988. Estate planning, elder law, trusts, probate. Document automation, estate planning software, client portal opportunity.',
  },
  {
    name: 'Jenne Law Firm',
    address: 'Cleveland, TN',
    website: 'jennelaw.com',
    priority: 5,
    notes:
      'Founded 1981 (family-owned). Personal injury, civil litigation, construction, insurance. Case management, e-discovery, document management opportunity.',
  },
  {
    name: 'Law Office of Sheridan Randolph',
    address: '255 North Ocoee Street, Cleveland, TN 37311',
    phone: '(423) 464-6793',
    website: 'sheridanrandolph.com',
    priority: 5,
    notes:
      'Founded 2015. Criminal defense, family law, estate planning. Case management software, client portal opportunity.',
  },
  {
    name: 'Logan-Thompson, P.C.',
    address: 'Cleveland, TN',
    website: 'loganthompsonlaw.com',
    priority: 5,
    notes:
      'Founded 1965 (60+ years). 10+ attorneys. Personal injury, commercial litigation, estate planning. Enterprise case management, document automation, client portals. Budget potential: $30K-$100K',
  },
  // AUTOMOTIVE
  {
    name: 'Don Ledford Auto Center',
    address: '4595 N Lee Hwy, Cleveland, TN 37312',
    phone: '(423) 472-2173',
    website: 'donledford.com',
    priority: 5,
    notes:
      'Founded 1981 (family-owned). 50-100 employees. Chevrolet, GMC. Lead management system, parts ordering automation, service portal, CRM. Budget potential: $40K-$100K',
  },
  {
    name: 'Cars & Credit',
    address: '120 Brent Dr SW, Cleveland, TN 37311',
    phone: '(423) 250-3005',
    website: 'carsandcredit.org',
    priority: 5,
    notes:
      '10-25 employees. Used cars with financing. Custom financing platform, credit approval automation, inventory management, online payment system. Budget potential: $25K-$75K',
  },
  // HVAC
  {
    name: 'Central Heat and Air Co.',
    address: '3160 Frazier Park Drive NE, Cleveland, TN 37323',
    phone: '(423) 478-7778',
    priority: 5,
    notes:
      '15-30 employees. Website redesign, service portal, mobile app opportunity.',
  },
  {
    name: "Day's Heating & Air LLC",
    address: 'Cleveland, TN',
    website: 'dayshvac.com',
    priority: 5,
    notes:
      '27+ years combined. 10-30 employees. Service scheduling software, customer database, e-commerce for parts opportunity.',
  },
  {
    name: 'DynaMech Solutions',
    address: 'Cleveland, TN',
    website: 'dynamechsolutions.com',
    priority: 5,
    notes:
      'Founded 2022. HVAC, electrical, plumbing. 15-35 employees. Integrated dispatch system, automated quoting opportunity.',
  },
  // CONSTRUCTION
  {
    name: 'TriStar General Contractors',
    address: 'Cleveland, TN',
    website: 'tristargeneralcontractors.com',
    priority: 5,
    notes:
      'Licenses: TN, GA, AL. 25-60 employees. Bid management platform, project dashboard, subcontractor portal. Budget potential: $30K-$100K',
  },
  {
    name: 'Wright Brothers Construction',
    address: 'Cleveland, TN',
    priority: 5,
    notes:
      '30-70 employees. Chamber member. Digital presence, project management tools opportunity.',
  },
  {
    name: 'Owens Construction Services',
    address: 'Cleveland, TN',
    website: 'ocs-llc.com',
    contact_name: 'Dustin Owens',
    priority: 5,
    notes:
      '10+ years. 10-25 employees. Roofing, siding, gutters, decks. Online quote calculator, project gallery CMS, customer portal opportunity.',
  },
  // LOGISTICS
  {
    name: 'Titus Transport',
    address: 'Cleveland, TN',
    website: 'titustrans.com',
    priority: 5,
    notes:
      'CDL trucking (local/semi-local). 30-70 employees. Driver portal, dispatch software, route optimization opportunity.',
  },
  // RESTAURANTS
  {
    name: "Lupi's Pizza Pies",
    address: '2382 North Ocoee Street, Cleveland, TN 37312',
    phone: '(423) 476-9464',
    website: 'lupi.com',
    priority: 5,
    notes:
      '15-25 employees. Modern online ordering, mobile app, delivery tracking opportunity.',
  },
  {
    name: 'El Don Mexican',
    address: '270 S. Ocoee St. SE, Cleveland, TN 37311',
    phone: '(423) 693-9310',
    priority: 5,
    notes:
      '10-20 employees. Website, online ordering, delivery integration opportunity.',
  },
];

// Combine all zones
const allCompanies = [...zone1Companies, ...zone2Companies, ...zone3Companies];

async function executeSQL(query: string): Promise<unknown[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  return response.json();
}

async function getExistingCompanies(): Promise<
  { name: string; address: string }[]
> {
  const result = (await executeSQL(
    `SELECT name, address FROM companies WHERE user_id = '${USER_ID}'`
  )) as { name: string; address: string }[];
  return result || [];
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

async function main() {
  console.log('Loading existing companies...');
  const existing = await getExistingCompanies();
  console.log(`Found ${existing.length} existing companies`);

  // Create lookup set for duplicates (name + address, lowercase)
  const existingSet = new Set(
    existing.map(
      (c) => `${c.name.toLowerCase().trim()}|${c.address.toLowerCase().trim()}`
    )
  );

  let inserted = 0;
  let skipped = 0;

  console.log(`\nProcessing ${allCompanies.length} companies from research...`);

  for (const company of allCompanies) {
    const key = `${company.name.toLowerCase().trim()}|${company.address.toLowerCase().trim()}`;

    if (existingSet.has(key)) {
      console.log(`  SKIP (duplicate): ${company.name}`);
      skipped++;
      continue;
    }

    // Build SQL
    const name = escapeSQL(company.name);
    const address = escapeSQL(company.address);
    const contactName = company.contact_name
      ? `'${escapeSQL(company.contact_name)}'`
      : 'NULL';
    const contactTitle = company.contact_title
      ? `'${escapeSQL(company.contact_title)}'`
      : 'NULL';
    const phone = company.phone ? `'${escapeSQL(company.phone)}'` : 'NULL';
    const email = company.email ? `'${escapeSQL(company.email)}'` : 'NULL';
    const website = company.website
      ? `'${escapeSQL(company.website)}'`
      : 'NULL';
    const notes = `'${escapeSQL(company.notes)}'`;
    const priority = company.priority;

    // Default coordinates for Cleveland, TN center - will need geocoding later
    const defaultLat = 35.1595;
    const defaultLng = -84.8766;
    const sql = `INSERT INTO companies (user_id, name, contact_name, contact_title, phone, email, website, address, latitude, longitude, status, priority, notes) VALUES ('${USER_ID}', '${name}', ${contactName}, ${contactTitle}, ${phone}, ${email}, ${website}, '${address}', ${defaultLat}, ${defaultLng}, 'not_contacted', ${priority}, ${notes}) RETURNING id`;

    try {
      const result = await executeSQL(sql);
      if (Array.isArray(result) && result.length > 0) {
        inserted++;
        console.log(`  ✓ Inserted: ${company.name}`);
      } else {
        console.error(`  ✗ Failed to insert ${company.name}:`, result);
      }
    } catch (err) {
      console.error(`  ✗ Error inserting ${company.name}:`, err);
    }

    // Add key to set to prevent duplicates within this batch
    existingSet.add(key);
  }

  console.log(`\n========================================`);
  console.log(`Done!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (duplicates): ${skipped}`);
  console.log(`  Total in research: ${allCompanies.length}`);
  console.log(`========================================`);
}

main().catch(console.error);
